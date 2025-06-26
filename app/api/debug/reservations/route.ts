import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/debug/reservations - Debug route to test database connection
export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG: Testing database connection ===')
    
    // Test 1: Check if we can connect to Supabase
    console.log('Testing Supabase connection...')
    
    // Test 2: Try to fetch reservations directly
    const { data: reservations, error: reservationsError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('Reservations query result:', {
      error: reservationsError,
      count: reservations?.length || 0,
      sample: reservations?.[0] || null
    })

    // Test 3: Check restaurant settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('*')
    
    console.log('Settings query result:', {
      error: settingsError,
      count: settings?.length || 0
    })

    // Test 4: Check table structure
    let tableInfo;
    let tableError;

    try {
      tableInfo = await supabaseAdmin.rpc('get_table_info', { table_name: 'reservations' });
      tableError = null;
    } catch (error) {
      tableInfo = 'RPC failed';
      tableError = 'RPC not supported';
    }

    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        tests: {
          reservations: {
            error: reservationsError,
            count: reservations?.length || 0,
            data: reservations?.slice(0, 3) || [] // First 3 for debugging
          },
          settings: {
            error: settingsError,
            count: settings?.length || 0,
            data: settings || []
          },
          tableInfo: {
            error: tableError,
            data: tableInfo
          }
        }
      }
    })

  } catch (error) {
    console.error('Debug route error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}