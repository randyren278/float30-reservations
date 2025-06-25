import { NextRequest, NextResponse } from 'next/server'
import { reservationService } from '@/lib/supabase'
import { apiRateLimiter, createRateLimitResponse } from '@/utils/rate-limit'

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  // In a production app, you'd use proper session management
  // For this MVP, we'll check a simple cookie or header
  const authCookie = request.cookies.get('admin_session')
  return authCookie?.value === 'true'
}

// GET /api/admin/reservations - Get all reservations (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check('admin-operations', 
      request.headers.get('x-forwarded-for') || 'unknown')
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get reservations
    const reservations = await reservationService.getAllReservations(status || undefined)

    return NextResponse.json({
      success: true,
      reservations,
      total: reservations.length
    })

  } catch (error) {
    console.error('Admin reservations fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch reservations.'
      },
      { status: 500 }
    )
  }
}