// app/api/table-config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/table-config - Get active table configurations (public access)
export async function GET(request: NextRequest) {
  try {
    // Fetch only active table configurations for public use
    const { data: tableConfigs, error: tableError } = await supabaseAdmin
      .from('table_configurations')
      .select('party_size, table_count, max_reservations_per_slot, is_active')
      .eq('is_active', true)
      .order('party_size', { ascending: true })

    if (tableError && tableError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('Public table config fetch error:', tableError)
      // Return default configurations if table doesn't exist yet
      const defaultConfigs = [
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
        { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ]
      
      return NextResponse.json({
        success: true,
        table_configs: defaultConfigs,
        global_settings: {
          max_party_size: 10,
          slot_duration: 30,
          advance_booking_days: 30
        }
      })
    }

    // Fetch basic global settings (public-safe)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['max_party_size', 'slot_duration', 'advance_booking_days'])

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

    return NextResponse.json({
      success: true,
      table_configs: tableConfigs || [],
      global_settings: globalSettings
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Public table config fetch error:', error)
    
    // Return default configurations on error to ensure the frontend works
    const defaultConfigs = [
      { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
      { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
      { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
      { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
      { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true },
      { party_size: 10, table_count: 1, max_reservations_per_slot: 1, is_active: true }
    ]
    
    return NextResponse.json({
      success: true,
      table_configs: defaultConfigs,
      global_settings: {
        max_party_size: 10,
        slot_duration: 30,
        advance_booking_days: 30
      }
    })
  }
}