import { z } from 'zod'
import { format, isAfter, isBefore, parseISO } from 'date-fns'

// Reservation form validation schema
export const reservationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine((phone) => {
      if (!phone) return true
      const cleanPhone = phone.replace(/\D/g, '')
      return cleanPhone.length >= 10 && cleanPhone.length <= 15
    }, 'Please enter a valid phone number'),
  
  party_size: z.number()
    .int('Party size must be a whole number')
    .min(1, 'Party size must be at least 1')
    .max(20, 'Party size cannot exceed 20 people'),
  
  reservation_date: z.string()
    .refine((date) => {
      const selectedDate = parseISO(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return isAfter(selectedDate, today) || format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    }, 'Reservation date must be today or in the future')
    .refine((date) => {
      const selectedDate = parseISO(date)
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30) // 30 days in advance
      return isBefore(selectedDate, maxDate)
    }, 'Reservations can only be made up to 30 days in advance'),
  
  reservation_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please select a valid time'),
  
  special_requests: z.string()
    .max(500, 'Special requests must be less than 500 characters')
    .optional()
}).refine((data) => {
  // Check if the reservation is not in the past for today's date
  const reservationDate = parseISO(data.reservation_date)
  const today = new Date()
  
  if (format(reservationDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    const [hours, minutes] = data.reservation_time.split(':').map(Number)
    const reservationDateTime = new Date(reservationDate)
    reservationDateTime.setHours(hours, minutes, 0, 0)
    
    return isAfter(reservationDateTime, today)
  }
  
  return true
}, {
  message: 'Reservation time must be in the future',
  path: ['reservation_time']
})

// Admin login validation
export const adminLoginSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// Restaurant settings validation
export const restaurantSettingsSchema = z.object({
  max_tables: z.number().int().min(1).max(50),
  slot_duration: z.number().int().min(15).max(120),
  advance_booking_days: z.number().int().min(1).max(90),
  opening_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closing_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  max_party_size: z.number().int().min(1).max(50),
  reservations_per_slot: z.number().int().min(1).max(10),
  closed_days: z.string().optional()
})

// Utility function to validate business hours
export const validateBusinessHours = (date: string, time: string) => {
  // This would typically check against restaurant_settings
  // For now, we'll use default hours: 5 PM - 10 PM
  const [hours] = time.split(':').map(Number)
  return hours >= 17 && hours < 22
}

// Utility function to validate if date is not a closed day
export const validateOpenDay = (date: string, closedDays: string[] = ['monday']) => {
  const dayOfWeek = format(parseISO(date), 'EEEE').toLowerCase()
  return !closedDays.includes(dayOfWeek)
}

// Phone number formatter
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}

// Email validation for confirmation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export type ReservationFormData = z.infer<typeof reservationSchema>
export type AdminLoginData = z.infer<typeof adminLoginSchema>
export type RestaurantSettingsData = z.infer<typeof restaurantSettingsSchema>