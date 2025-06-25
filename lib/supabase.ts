import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

// Utility functions for common operations
export const reservationService = {
  // Create a new reservation
  async createReservation(reservation: Database['public']['Tables']['reservations']['Insert']) {
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get reservations for a specific date
  async getReservationsByDate(date: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('reservation_date', date)
      .eq('status', 'confirmed')
      .order('reservation_time')
    
    if (error) throw error
    return data
  },

  // Check slot availability
  async checkSlotAvailability(date: string, time: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_date', date)
      .eq('reservation_time', time)
      .eq('status', 'confirmed')
    
    if (error) throw error
    
    // Get max reservations per slot from settings
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('setting_key', 'reservations_per_slot')
      .single()
    
    const maxReservations = parseInt(settings?.setting_value || '3')
    return (data?.length || 0) < maxReservations
  },

  // Get all reservations (admin only)
  async getAllReservations(status?: string) {
    let query = supabaseAdmin
      .from('reservations')
      .select('*')
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query.order('reservation_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Update reservation status
  async updateReservationStatus(id: string, status: Database['public']['Tables']['reservations']['Row']['status']) {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get restaurant settings
  async getRestaurantSettings() {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
    
    if (error) throw error
    
    // Convert to key-value object
    const settings: Record<string, string> = {}
    data?.forEach(setting => {
      settings[setting.setting_key] = setting.setting_value
    })
    
    return settings
  },

  // Get available time slots for a date
  async getAvailableSlots(date: string) {
    const { data, error } = await supabase
      .from('available_slots')
      .select('*')
      .eq('date', date)
      .eq('available', true)
      .order('time')
    
    if (error) throw error
    return data
  }
}