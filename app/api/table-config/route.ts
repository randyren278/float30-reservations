// app/api/table-config/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/table-config - Get active table configurations (public access)
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Public table config API called - FIXED VERSION')
    
    // Extract cache busting params for debugging
    const url = new URL(request.url)
    const timestamp = url.searchParams.get('t') || 'none'
    const force = url.searchParams.get('force') === '1'
    console.log('Request params:', { timestamp, force, url: url.toString() })

    // ALWAYS fetch fresh data from database - no caching at this level
    console.log('📊 Fetching table configurations from database (forced fresh)...')
    
    // Fetch table configurations with explicit ordering
    const { data: tableConfigs, error: tableError } = await supabaseAdmin
      .from('table_configurations')
      .select('party_size, table_count, max_reservations_per_slot, is_active')
      .eq('is_active', true)
      .order('party_size', { ascending: true })

    console.log('Table configs query result:', { 
      error: tableError?.message, 
      count: tableConfigs?.length || 0,
      configs: tableConfigs?.map(c => ({ 
        party_size: c.party_size, 
        active: c.is_active,
        table_count: c.table_count,
        max_reservations: c.max_reservations_per_slot
      }))
    })

    // Fetch global settings with explicit field selection
    console.log('⚙️ Fetching global settings from database...')
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['max_party_size', 'slot_duration', 'advance_booking_days'])

    console.log('Settings query result:', { 
      error: settingsError?.message, 
      count: settings?.length || 0,
      settings: settings?.map(s => ({ key: s.setting_key, value: s.setting_value }))
    })

    // Build global settings object
    const globalSettings = {
      max_party_size: 10,
      slot_duration: 30,
      advance_booking_days: 30
    }

    if (settings && !settingsError) {
      settings.forEach(setting => {
        if (setting.setting_key in globalSettings) {
          globalSettings[setting.setting_key as keyof typeof globalSettings] = parseInt(setting.setting_value)
        }
      })
    }

    console.log('Final global settings:', globalSettings)

    // Determine source and handle edge cases
    let finalTableConfigs = []
    let source = 'unknown'

    if (tableError) {
      console.error('❌ Table config database error:', tableError)
      
      if (tableError.code === 'PGRST116') {
        console.log('⚠️ Table configurations table does not exist, using defaults')
        source = 'defaults_table_missing'
      } else {
        console.log('⚠️ Table config query failed, using defaults')
        source = 'defaults_query_failed'
      }
      
      // Use comprehensive defaults
      finalTableConfigs = [
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
        { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ]
    } else if (!tableConfigs || tableConfigs.length === 0) {
      console.log('⚠️ No active table configurations found in database, using defaults')
      source = 'defaults_empty_result'
      finalTableConfigs = [
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
        { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ]
    } else {
      console.log('✅ Using database table configurations')
      source = 'database'
      finalTableConfigs = tableConfigs
    }

    console.log(`📤 Returning ${finalTableConfigs.length} table configurations from ${source}`)

    // Create response with current timestamp
    const responseTimestamp = new Date().toISOString()
    const response = NextResponse.json({
      success: true,
      table_configs: finalTableConfigs,
      global_settings: globalSettings,
      timestamp: responseTimestamp,
      source,
      debug: {
        request_timestamp: timestamp,
        response_timestamp: responseTimestamp,
        force_requested: force,
        table_error: tableError?.message || null,
        settings_error: settingsError?.message || null,
        configs_count: finalTableConfigs.length,
        slot_duration: globalSettings.slot_duration
      }
    })

    // Set EXTREMELY aggressive anti-cache headers
    const antiCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date(0).toUTCString(),
      'ETag': `"${Date.now()}-${Math.random().toString(36).substring(7)}"`,
      'Vary': '*',
      'X-Timestamp': Date.now().toString(),
      'X-Cache-Buster': Math.random().toString(36).substring(7),
      'X-Source': source,
      'X-Config-Count': finalTableConfigs.length.toString(),
      'X-Slot-Duration': globalSettings.slot_duration.toString()
    }

    Object.entries(antiCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    console.log('✅ Response created with anti-cache headers')
    return response

  } catch (error) {
    console.error('❌ Critical error in public table config API:', error)
    
    // Return safe defaults even on complete failure
    const emergencyDefaults = [
      { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
      { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
      { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
      { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
      { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
      { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
    ]
    
    const errorResponse = NextResponse.json({
      success: true, // Still return success to not break frontend
      table_configs: emergencyDefaults,
      global_settings: {
        max_party_size: 10,
        slot_duration: 30,
        advance_booking_days: 30
      },
      source: 'emergency_defaults',
      error_fallback: true,
      timestamp: new Date().toISOString(),
      error_details: error instanceof Error ? error.message : 'Unknown error'
    })

    // Apply anti-cache headers to error response too
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')
    errorResponse.headers.set('X-Emergency-Fallback', 'true')

    return errorResponse
  }
}

// Ensure proper method handling
export async function POST() {
  return new Response('Method not allowed', { status: 405 })
}

export async function PUT() {
  return new Response('Method not allowed', { status: 405 })
}

export async function DELETE() {
  return new Response('Method not allowed', { status: 405 })
}