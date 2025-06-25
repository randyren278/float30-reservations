export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      reservations: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          special_requests: string | null
          status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          special_requests?: string | null
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          special_requests?: string | null
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          created_at?: string
          updated_at?: string
        }
      }
      restaurant_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      available_slots: {
        Row: {
          date: string
          time: string
          current_reservations: number
          max_reservations: number
          available: boolean
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Reservation = Database['public']['Tables']['reservations']['Row']
export type NewReservation = Database['public']['Tables']['reservations']['Insert']
export type UpdateReservation = Database['public']['Tables']['reservations']['Update']
export type RestaurantSetting = Database['public']['Tables']['restaurant_settings']['Row']
export type AvailableSlot = Database['public']['Views']['available_slots']['Row']