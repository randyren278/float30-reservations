import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/closures - Get all closures (public access)
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Public closures API called with aggressive cache busting')
    
    // Log request details for debugging
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())
    console.log('Request params:', searchParams)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Use admin client to ensure we can read closures
    const { data: closures, error } = await supabaseAdmin
      .from('restaurant_closures')
      .select('closure_date, closure_name, all_day, start_time, end_time, id')
      .gte('closure_date', new Date().toISOString().split('T')[0]) // Only future closures
      .order('closure_date', { ascending: true })

    console.log('Supabase query executed')
    console.log('Query result:', { error: error?.message, count: closures?.length || 0 })
    
    if (error) {
      console.error('Supabase error in public closures:', error)
      throw error
    }

    // Log each closure for debugging
    if (closures && closures.length > 0) {
      console.log('Closure details:')
      closures.forEach((closure, index) => {
        console.log(`  ${index + 1}. ${closure.closure_date} - ${closure.closure_name} (ID: ${closure.id?.substring(0, 8)})`)
      })
    } else {
      console.log('No closures found in database')
    }

    console.log('Returning closures to client:', closures?.length || 0, 'items')

    // Create response with aggressive anti-caching headers
    const response = NextResponse.json({
      success: true,
      closures: closures || [],
      timestamp: new Date().toISOString(),
      count: closures?.length || 0
    })

    // Set multiple anti-cache headers to prevent ANY caching
    const antiCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': Math.random().toString(36).substring(7), // Random ETag to prevent caching
      'Vary': '*',
      'X-Accel-Expires': '0', // Nginx cache
      'X-Cache-Control': 'no-cache',
      'X-Timestamp': new Date().getTime().toString()
    }

    // Apply all anti-cache headers
    Object.entries(antiCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    console.log('✅ Response created with anti-cache headers')
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    return response

  } catch (error) {
    console.error('❌ Public closures fetch error:', error)
    
    // Even error responses should not be cached
    const errorResponse = NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch closures.',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )

    // Apply anti-cache headers to error response too
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')

    return errorResponse
  }
}