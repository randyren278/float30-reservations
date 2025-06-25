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
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Success response
    return NextResponse.json(
      { 
        success: true,
        message: 'Login successful'
      },
      { 
        status: 200,
        headers: {
          'Set-Cookie': `admin_session=true; HttpOnly; SameSite=Strict; Max-Age=3600; Path=/admin`
        }
      }
    )

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