import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
  end_time: z.string().optional().or(z.literal(''))
})

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

// POST /api/admin/closures - Create new closure
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

    // Remove empty string values that would cause database errors
    const cleanClosureData = Object.fromEntries(
      Object.entries(closureData).filter(([_, value]) => value !== '' && value !== undefined)
    )

    const { data: closure, error } = await supabaseAdmin
      .from('restaurant_closures')
      .insert(cleanClosureData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A closure already exists for this date' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Closure created successfully',
        closure
      },
      { status: 201 }
    )

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