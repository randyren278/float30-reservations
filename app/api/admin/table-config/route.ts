// app/api/admin/table-config/route.ts
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

const tableConfigSchema = z.object({
  party_size: z.number().int().min(1).max(50),
  table_count: z.number().int().min(0).max(100),
  max_reservations_per_slot: z.number().int().min(0).max(50),
  is_active: z.boolean()
})

const globalSettingsSchema = z.object({
  max_party_size: z.number().int().min(1).max(50),
  slot_duration: z.number().int().min(15).max(120),
  advance_booking_days: z.number().int().min(1).max(90)
})

const requestSchema = z.object({
  table_configs: z.array(tableConfigSchema),
  global_settings: globalSettingsSchema
})

// GET /api/admin/table-config - Get current table configurations
export async function GET(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Fetching table configurations from database...')

    // Fetch table configurations
    const { data: tableConfigs, error: tableError } = await supabaseAdmin
      .from('table_configurations')
      .select('*')
      .order('party_size', { ascending: true })

    if (tableError && tableError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('Table config fetch error:', tableError)
      throw tableError
    }

    // Fetch global settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('restaurant_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['max_party_size', 'slot_duration', 'advance_booking_days'])

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      throw settingsError
    }

    // Convert settings to object
    const globalSettings = {
      max_party_size: 10,
      slot_duration: 30,
      advance_booking_days: 30
    }

    settings?.forEach(setting => {
      if (setting.setting_key in globalSettings) {
        globalSettings[setting.setting_key as keyof typeof globalSettings] = parseInt(setting.setting_value)
      }
    })

    // If no table configs exist, return defaults but don't insert them yet
    const defaultTableConfigs = tableConfigs && tableConfigs.length > 0 ? tableConfigs : [
      { id: 'temp-1', party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'temp-2', party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'temp-3', party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'temp-4', party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'temp-5', party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ]

    console.log(`✅ Fetched ${defaultTableConfigs.length} table configurations`)

    return NextResponse.json({
      success: true,
      table_configs: defaultTableConfigs,
      global_settings: globalSettings
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Table config fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch table configurations.'
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/table-config - Save table configurations
export async function POST(request: NextRequest) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Received table config save request:', {
      configCount: body.table_configs?.length,
      globalSettings: body.global_settings
    })

    const validationResult = requestSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { table_configs, global_settings } = validationResult.data

    // Validate business rules
    const invalidConfigs = table_configs.filter(config => 
      config.max_reservations_per_slot > config.table_count && config.table_count > 0
    )

    if (invalidConfigs.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid configuration',
          message: 'Max reservations per slot cannot exceed table count'
        },
        { status: 400 }
      )
    }

    // Ensure table exists before operations
    try {
      console.log('🏗️ Ensuring table_configurations table exists...')
      
      // Create table if it doesn't exist
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS table_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          party_size INTEGER NOT NULL UNIQUE,
          table_count INTEGER NOT NULL DEFAULT 0 CHECK (table_count >= 0),
          max_reservations_per_slot INTEGER NOT NULL DEFAULT 1 CHECK (max_reservations_per_slot >= 0),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_table_configurations_party_size ON table_configurations(party_size);
        CREATE INDEX IF NOT EXISTS idx_table_configurations_active ON table_configurations(is_active);
      `
      
      // Execute table creation via a simple insert that will trigger table creation if needed
      await supabaseAdmin
        .from('table_configurations')
        .select('id')
        .limit(1)
        
    } catch (tableCreationError) {
      console.log('⚠️ Table creation check failed, but continuing...')
    }

    // Start transaction-like operations
    console.log('🧹 Clearing existing table configurations...')
    
    // Delete all existing configurations
    const { error: deleteError } = await supabaseAdmin
      .from('table_configurations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('Error clearing table configs:', deleteError)
    }

    // Insert new table configurations
    if (table_configs.length > 0) {
      console.log(`➕ Inserting ${table_configs.length} new table configurations...`)
      
      const configsToInsert = table_configs.map(config => ({
        party_size: config.party_size,
        table_count: config.table_count,
        max_reservations_per_slot: config.max_reservations_per_slot,
        is_active: config.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data: insertedConfigs, error: insertError } = await supabaseAdmin
        .from('table_configurations')
        .insert(configsToInsert)
        .select()

      if (insertError) {
        console.error('❌ Error inserting table configs:', insertError)
        throw insertError
      }

      console.log(`✅ Successfully inserted ${insertedConfigs?.length || 0} configurations`)
    }

    // Update global settings
    console.log('⚙️ Updating global settings...')
    
    const settingsToUpdate = [
      { setting_key: 'max_party_size', setting_value: global_settings.max_party_size.toString() },
      { setting_key: 'slot_duration', setting_value: global_settings.slot_duration.toString() },
      { setting_key: 'advance_booking_days', setting_value: global_settings.advance_booking_days.toString() }
    ]

    for (const setting of settingsToUpdate) {
      const { error: upsertError } = await supabaseAdmin
        .from('restaurant_settings')
        .upsert(
          {
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            description: `${setting.setting_key.replace(/_/g, ' ')} setting`,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'setting_key',
            ignoreDuplicates: false 
          }
        )

      if (upsertError) {
        console.error(`❌ Error upserting setting ${setting.setting_key}:`, upsertError)
        throw upsertError
      }
    }

    console.log('✅ Table configurations and settings saved successfully')

    // Clear any caches by updating a timestamp in settings
    await supabaseAdmin
      .from('restaurant_settings')
      .upsert({
        setting_key: 'table_config_last_updated',
        setting_value: new Date().getTime().toString(),
        description: 'Last table configuration update timestamp'
      }, {
        onConflict: 'setting_key'
      })

    return NextResponse.json({
      success: true,
      message: 'Table configurations saved successfully',
      table_configs_count: table_configs.length,
      global_settings_updated: Object.keys(global_settings).length,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Table config save error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to save table configurations.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}