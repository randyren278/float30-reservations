import { NextRequest, NextResponse } from 'next/server'
import { reservationService } from '@/lib/supabase'
import { emailService } from '@/lib/email'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show'])
})

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin_session')
  return authCookie?.value === 'true'
}

// PATCH /api/admin/reservations/[id] - Update reservation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid reservation ID format' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateStatusSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

    // Get current reservation details first
    const reservations = await reservationService.getAllReservations()
    const currentReservation = reservations.find(r => r.id === id)
    
    if (!currentReservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Update reservation status
    const updatedReservation = await reservationService.updateReservationStatus(id, status)

    // Send cancellation email if status changed to cancelled
    if (status === 'cancelled' && currentReservation.status !== 'cancelled') {
      try {
        await emailService.sendCancellationEmail(updatedReservation)
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError)
        // Don't fail the status update if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reservation status updated to ${status}`,
      reservation: updatedReservation
    })

  } catch (error) {
    console.error('Update reservation status error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update reservation status.'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/reservations/[id] - Delete reservation (optional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // For this MVP, we'll just mark as cancelled instead of deleting
    // This preserves data integrity and audit trail
    const updatedReservation = await reservationService.updateReservationStatus(id, 'cancelled')

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled',
      reservation: updatedReservation
    })

  } catch (error) {
    console.error('Delete reservation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to cancel reservation.'
      },
      { status: 500 }
    )
  }
}