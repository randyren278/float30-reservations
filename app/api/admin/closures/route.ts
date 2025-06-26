// app/api/admin/closures/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { emailService } from '@/lib/email'
import { z } from 'zod'

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin_session')
  if (authCookie?.value === 'true') return true
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) return true
  
  return false
}

const closureSchema = z.object({
  closure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closure_name: z.string().min(1).max(100),
  closure_reason: z.string().max(255).optional().or(z.literal('')),
  all_day: z.boolean().default(true),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  force_cancel_reservations: z.boolean().default(false) // New field for force cancellation
})

// Helper function to get conflicting reservations
async function getConflictingReservations(closureData: any) {
  const { closure_date, all_day, start_time, end_time } = closureData
  
  // Base query for reservations on the closure date
  let query = supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('reservation_date', closure_date)
    .in('status', ['confirmed']) // Only check confirmed reservations
  
  // If it's a partial closure, filter by time
  if (!all_day && start_time && end_time) {
    query = query
      .gte('reservation_time', start_time)
      .lte('reservation_time', end_time)
  }
  
  const { data: conflictingReservations, error } = await query
  
  if (error) {
    console.error('Error fetching conflicting reservations:', error)
    throw error
  }
  
  return conflictingReservations || []
}

// Helper function to cancel conflicting reservations
async function cancelConflictingReservations(reservations: any[], closureInfo: { closure_name: string; closure_reason?: string }) {
  const cancelledReservations = []
  
  for (const reservation of reservations) {
    try {
      // Update reservation status to cancelled
      const { data: updatedReservation, error } = await supabaseAdmin
        .from('reservations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservation.id)
        .select()
        .single()
      
      if (error) {
        console.error(`Failed to cancel reservation ${reservation.id}:`, error)
        continue
      }
      
      cancelledReservations.push(updatedReservation)
      
      // Send closure-specific cancellation email
      try {
        await emailService.sendCancellationEmail(updatedReservation, {
          name: closureInfo.closure_name,
          reason: closureInfo.closure_reason
        })
        console.log(`Closure cancellation email sent for reservation ${reservation.id}`)
      } catch (emailError) {
        console.error(`Failed to send closure cancellation email for reservation ${reservation.id}:`, emailError)
        // Don't fail the closure creation if email fails
      }
      
    } catch (error) {
      console.error(`Error processing cancellation for reservation ${reservation.id}:`, error)
    }
  }
  
  return cancelledReservations
}

// GET /api/admin/closures - Get all closures
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: closures, error } = await supabaseAdmin
      .from('restaurant_closures')
      .select('*')
      .order('closure_date', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      closures: closures || []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Closures fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch closures.'
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/closures - Create new closure with conflict detection
export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = closureSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const closureData = validationResult.data

    // Clean up time fields for all-day closures
    if (closureData.all_day) {
      closureData.start_time = undefined
      closureData.end_time = undefined
    } else {
      // Ensure partial day closures have both start and end times
      if (!closureData.start_time || !closureData.end_time) {
        return NextResponse.json(
          { error: 'Start and end times are required for partial day closures' },
          { status: 400 }
        )
      }
    }

    // Check for conflicting reservations
    const conflictingReservations = await getConflictingReservations(closureData)
    
    console.log(`Found ${conflictingReservations.length} conflicting reservations for closure on ${closureData.closure_date}`)
    
    // If there are conflicts and force flag is not set, return conflict info
    if (conflictingReservations.length > 0 && !closureData.force_cancel_reservations) {
      return NextResponse.json({
        error: 'Reservation conflicts detected',
        message: `There are ${conflictingReservations.length} existing reservations that conflict with this closure`,
        conflicting_reservations: conflictingReservations.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          reservation_time: r.reservation_time,
          party_size: r.party_size,
          special_requests: r.special_requests
        })),
        requires_confirmation: true
      }, { status: 409 }) // Conflict status
    }

    // Remove the force flag from closure data before insertion
    const { force_cancel_reservations, ...cleanClosureData } = closureData

    // Remove empty string values that would cause database errors
    const finalClosureData = Object.fromEntries(
      Object.entries(cleanClosureData).filter(([_, value]) => value !== '' && value !== undefined)
    )

    // Create the closure
    const { data: closure, error: closureError } = await supabaseAdmin
      .from('restaurant_closures')
      .insert(finalClosureData)
      .select()
      .single()

    if (closureError) {
      if (closureError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A closure already exists for this date' },
          { status: 409 }
        )
      }
      throw closureError
    }

    let cancelledReservations: any[] = []
    
    // Cancel conflicting reservations if force flag was set
    if (conflictingReservations.length > 0 && closureData.force_cancel_reservations) {
      console.log(`Cancelling ${conflictingReservations.length} conflicting reservations...`)
      cancelledReservations = await cancelConflictingReservations(conflictingReservations, {
        closure_name: closureData.closure_name,
        closure_reason: closureData.closure_reason
      })
      console.log(`Successfully cancelled ${cancelledReservations.length} reservations`)
    }

    return NextResponse.json({
      success: true,
      message: 'Closure created successfully',
      closure,
      cancelled_reservations: cancelledReservations,
      conflicts_resolved: cancelledReservations.length
    }, { status: 201 })

  } catch (error) {
    console.error('Closure creation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create closure.'
      },
      { status: 500 }
    )
  }
}