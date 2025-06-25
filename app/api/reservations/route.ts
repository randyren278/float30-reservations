import { NextRequest, NextResponse } from 'next/server'
import { reservationSchema } from '@/lib/validation'
import { reservationService } from '@/lib/supabase'
import { emailService } from '@/lib/email'
import { apiRateLimiter, createRateLimitResponse } from '@/utils/rate-limit'

// POST /api/reservations - Create new reservation
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('reservation-create', 
      request.headers.get('x-forwarded-for') || 'unknown')
    
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

    // Check slot availability
    const isAvailable = await reservationService.checkSlotAvailability(
      reservationData.reservation_date,
      reservationData.reservation_time
    )

    if (!isAvailable) {
      return NextResponse.json(
        { 
          error: 'Time slot not available',
          message: 'This time slot is fully booked. Please select a different time.'
        },
        { status: 409 }
      )
    }

    // Create reservation
    const reservation = await reservationService.createReservation(reservationData)

    // Send confirmation emails
    try {
      await emailService.sendReservationEmails(reservation)
    } catch (emailError) {
      // Log email error but don't fail the reservation
      console.error('Email sending failed:', emailError)
      
      // You might want to store failed email attempts for retry
      // For now, we'll continue with the successful reservation
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Reservation created successfully',
        reservation: {
          id: reservation.id,
          name: reservation.name,
          reservation_date: reservation.reservation_date,
          reservation_time: reservation.reservation_time,
          party_size: reservation.party_size,
          status: reservation.status
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Reservation creation error:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique_email_date')) {
        return NextResponse.json(
          { 
            error: 'Duplicate reservation',
            message: 'You already have a reservation for this date and time.'
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
        message: 'Failed to create reservation. Please try again.'
      },
      { status: 500 }
    )
  }
}

// GET /api/reservations - Get available slots (public)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('reservation-check', 
      request.headers.get('x-forwarded-for') || 'unknown')
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
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

    // Get available slots for the date
    const availableSlots = await reservationService.getAvailableSlots(date)

    return NextResponse.json({
      success: true,
      date,
      slots: availableSlots
    })

  } catch (error) {
    console.error('Available slots error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch available slots.'
      },
      { status: 500 }
    )
  }
}