import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/closures - Get all closures (public access)
export async function GET(request: NextRequest) {
  try {
    console.log('Public closures API called')
    
    // Use admin client to ensure we can read closures
    const { data: closures, error } = await supabaseAdmin
      .from('restaurant_closures')
      .select('closure_date, closure_name, all_day, start_time, end_time')
      .gte('closure_date', new Date().toISOString().split('T')[0]) // Only future closures
      .order('closure_date', { ascending: true })

    console.log('Public closures query result:', { error, count: closures?.length || 0, data: closures })
    
    if (error) {
      console.error('Supabase error in public closures:', error)
      throw error
    }

    console.log('Returning closures to client:', closures)

    // Set cache headers to prevent caching and ensure fresh data
    const response = NextResponse.json({
      success: true,
      closures: closures || []
    })

    // Prevent all caching to ensure instant updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Last-Modified', new Date().toUTCString())

    return response

  } catch (error) {
    console.error('Public closures fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch closures.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}