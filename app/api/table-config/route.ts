// app/api/table-config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/table-config - Get active table configurations (public access)
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Public table config API called with cache busting')
    
    // Add cache busting
    const timestamp = new Date().getTime()
    console.log('Request timestamp:', timestamp)

    // Fetch only active table configurations for public use
    const { data: tableConfigs, error: tableError } = await supabaseAdmin
      .from('table_configurations')
      .select('party_size, table_count, max_reservations_per_slot, is_active')
      .eq('is_active', true)
      .order('party_size', { ascending: true })

    console.log('Table configs query result:', { 
      error: tableError?.message, 
      count: tableConfigs?.length || 0,
      configs: tableConfigs?.map(c => ({ party_size: c.party_size, active: c.is_active }))
    })

    // Fetch basic global settings (public-safe)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['max_party_size', 'slot_duration', 'advance_booking_days'])

    console.log('Settings query result:', { 
      error: settingsError?.message, 
      count: settings?.length || 0 
    })

    const globalSettings = {
      max_party_size: 10,
      slot_duration: 30,
      advance_booking_days: 30
    }

    if (!settingsError && settings) {
      settings.forEach(setting => {
        if (setting.setting_key in globalSettings) {
          globalSettings[setting.setting_key as keyof typeof globalSettings] = parseInt(setting.setting_value)
        }
      })
    }

    // If no table configs found, check if we should return defaults
    let finalTableConfigs = tableConfigs || []

    // If database has no configurations or error occurred, provide safe defaults
    if (tableError && tableError.code === 'PGRST116') {
      console.log('⚠️ Table configurations table does not exist, using defaults')
      finalTableConfigs = [
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
        { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ]
    } else if (finalTableConfigs.length === 0) {
      console.log('⚠️ No active table configurations found, using defaults')
      finalTableConfigs = [
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
        { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ]
    }

    console.log(`✅ Returning ${finalTableConfigs.length} table configurations to public`)

    const response = NextResponse.json({
      success: true,
      table_configs: finalTableConfigs,
      global_settings: globalSettings,
      timestamp: new Date().toISOString(),
      source: (tableConfigs || []).length > 0 ? 'database' : 'defaults'
    })

    // Set aggressive anti-cache headers
    const antiCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random().toString(36).substring(7)}"`,
      'Vary': '*',
      'X-Timestamp': timestamp.toString()
    }

    Object.entries(antiCacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    console.error('❌ Public table config fetch error:', error)
    
    // Return safe defaults on error to ensure the frontend works
    const defaultConfigs = [
      { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
      { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
      { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
      { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
      { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
      { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
    ]
    
    const errorResponse = NextResponse.json({
      success: true, // Still return success to not break frontend
      table_configs: defaultConfigs,
      global_settings: {
        max_party_size: 10,
        slot_duration: 30,
        advance_booking_days: 30
      },
      error_fallback: true,
      timestamp: new Date().toISOString()
    })

    // Apply anti-cache headers to error response too
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')

    return errorResponse
  }
}