// app/api/admin/closures/check-conflicts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkClosureConflicts, getConflictSummary } from '@/lib/closure-conflict-checker'
import { z } from 'zod'

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin_session')
  if (authCookie?.value === 'true') return true
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) return true
  
  return false
}

const checkConflictsSchema = z.object({
  closure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  all_day: z.boolean().default(true),
  start_time: z.string().optional(),
  end_time: z.string().optional()
})

// POST /api/admin/closures/check-conflicts - Check for conflicts before creating closure
export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = checkConflictsSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { closure_date, all_day, start_time, end_time } = validationResult.data

    // Validate partial day closures
    if (!all_day && (!start_time || !end_time)) {
      return NextResponse.json(
        { error: 'Start and end times are required for partial day closures' },
        { status: 400 }
      )
    }

    // Create a temporary closure object for conflict checking
    const tempClosure = {
      id: 'temp',
      closure_date,
      closure_name: 'Temporary Check',
      all_day,
      start_time: all_day ? undefined : start_time,
      end_time: all_day ? undefined : end_time
    }

    // Check for conflicts
    const conflicts = await checkClosureConflicts(tempClosure)
    const summary = getConflictSummary(conflicts)

    return NextResponse.json({
      success: true,
      has_conflicts: conflicts.length > 0,
      conflict_count: conflicts.length,
      summary,
      conflicting_reservations: conflicts.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        reservation_time: r.reservation_time,
        party_size: r.party_size,
        special_requests: r.special_requests
      }))
    })

  } catch (error) {
    console.error('Conflict check error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to check for conflicts.'
      },
      { status: 500 }
    )
  }
}

// GET /api/admin/closures/check-conflicts?date=YYYY-MM-DD - Quick conflict check for a date
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Check for any existing reservations on this date
    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select('id, name, reservation_time, party_size, status')
      .eq('reservation_date', date)
      .in('status', ['confirmed'])
      .order('reservation_time')

    if (error) {
      console.error('Error fetching reservations:', error)
      throw error
    }

    const reservationCount = reservations?.length || 0
    const totalGuests = reservations?.reduce((sum, r) => sum + r.party_size, 0) || 0

    return NextResponse.json({
      success: true,
      date,
      has_reservations: reservationCount > 0,
      reservation_count: reservationCount,
      total_guests: totalGuests,
      reservations: reservations?.map(r => ({
        id: r.id,
        name: r.name,
        reservation_time: r.reservation_time,
        party_size: r.party_size,
        status: r.status
      })) || []
    })

  } catch (error) {
    console.error('Date check error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to check date for reservations.'
      },
      { status: 500 }
    )
  }
}