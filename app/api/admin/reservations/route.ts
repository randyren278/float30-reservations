import { NextRequest, NextResponse } from 'next/server'
import { reservationService } from '@/lib/supabase'
import { apiRateLimiter, createRateLimitResponse } from '@/utils/rate-limit'

// Simple authentication check - improved to be more flexible
function isAuthenticated(request: NextRequest): boolean {
  // Check for admin session cookie
  const authCookie = request.cookies.get('admin_session')
  if (authCookie?.value === 'true') {
    return true
  }
  
  // Also check for Authorization header as backup
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return true
  }
  
  return false
}

// GET /api/admin/reservations - Get all reservations (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      console.log('Admin access denied - not authenticated')
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

    console.log('Fetching reservations from database...', { status })

    // Get reservations
    const reservations = await reservationService.getAllReservations(status || undefined)
    
    console.log(`Found ${reservations.length} reservations in database`)

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
        message: 'Failed to fetch reservations.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}