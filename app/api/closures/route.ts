import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/closures - Get all closures (public access)
export async function GET(request: NextRequest) {
  try {
    const { data: closures, error } = await supabase
      .from('restaurant_closures')
      .select('closure_date, closure_name, all_day, start_time, end_time')
      .gte('closure_date', new Date().toISOString().split('T')[0]) // Only future closures
      .order('closure_date', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      closures: closures || []
    })

  } catch (error) {
    console.error('Public closures fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch closures.'
      },
      { status: 500 }
    )
  }
}