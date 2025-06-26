import { NextRequest, NextResponse } from 'next/server'
import { adminLoginSchema } from '@/lib/validation'
import { apiRateLimiter, createRateLimitResponse } from '@/utils/rate-limit'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'float30admin123'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for login attempts
    const rateLimitResult = apiRateLimiter.check('admin-login', 
      request.headers.get('x-forwarded-for') || 'unknown')
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = adminLoginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { password } = validationResult.data

    // Check password
    if (password !== ADMIN_PASSWORD) {
      console.log('Invalid admin password attempt')
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    console.log('Admin login successful')

    // Success response with proper cookie
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Login successful'
      },
      { status: 200 }
    )

    // Set cookie for browser
    response.cookies.set('admin_session', 'true', {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Login failed. Please try again.'
      },
      { status: 500 }
    )
  }
}