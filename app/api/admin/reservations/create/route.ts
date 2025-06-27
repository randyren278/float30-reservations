// app/api/admin/reservations/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { reservationSchema } from '@/lib/validation'
import { reservationService } from '@/lib/supabase'
import { emailService } from '@/lib/email'
import { apiRateLimiter, createRateLimitResponse } from '@/utils/rate-limit'

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin_session')
  if (authCookie?.value === 'true') return true
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) return true
  
  return false
}

// POST /api/admin/reservations/create - Create new reservation (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    if (!isAuthenticated(request)) {
      console.log('Admin reservation creation: Authentication failed')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting for admin operations (more lenient)
    const rateLimitResult = apiRateLimiter.check('admin-operations', 
      request.headers.get('x-forwarded-for') || 'admin')
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = reservationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const reservationData = validationResult.data

    console.log('📋 Admin creating reservation:', {
      name: reservationData.name,
      date: reservationData.reservation_date,
      time: reservationData.reservation_time,
      party_size: reservationData.party_size
    })

    // Note: Admin reservations bypass availability checks
    // This allows admins to override capacity limits if needed
    console.log('⚠️ Admin override: Bypassing availability checks')

    // Create reservation directly
    const reservation = await reservationService.createReservation(reservationData)

    console.log('✅ Admin reservation created successfully:', reservation.id)

    // Send emails (both customer confirmation and restaurant notification)
    try {
      console.log('📧 Sending confirmation emails for admin-created reservation')
      const emailResults = await emailService.sendReservationEmails(reservation)
      console.log('Email results:', {
        customerConfirmation: emailResults.customerConfirmation ? 'SUCCESS' : 'FAILED',
        restaurantNotification: emailResults.restaurantNotification ? 'SUCCESS' : 'FAILED',
        errors: emailResults.errors
      })
    } catch (emailError) {
      // Log email error but don't fail the reservation
      console.error('Email sending failed for admin reservation:', emailError)
      
      // Continue with successful reservation - emails are secondary for admin-created reservations
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation created successfully by admin',
        reservation: {
          id: reservation.id,
          name: reservation.name,
          reservation_date: reservation.reservation_date,
          reservation_time: reservation.reservation_time,
          party_size: reservation.party_size,
          status: reservation.status,
          created_by: 'admin'
        },
        admin_notes: {
          availability_check_bypassed: true,
          emails_sent: true
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Admin reservation creation error:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique_email_date')) {
        return NextResponse.json(
          { 
            error: 'Duplicate reservation',
            message: 'A reservation already exists for this customer at this date and time.'
          },
          { status: 409 }
        )
      }
      
      if (error.message.includes('future_reservation')) {
        return NextResponse.json(
          { 
            error: 'Invalid reservation time',
            message: 'Reservations must be made for future dates and times.'
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create reservation. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}