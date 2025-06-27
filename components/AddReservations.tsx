'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addDays, parseISO } from 'date-fns'
import { Calendar, Clock, Users, Mail, Phone, MessageSquare, CheckCircle, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { reservationSchema, type ReservationFormData } from '@/lib/validation'
import { formatPhoneNumber } from '@/lib/validation'

interface AddReservationProps {
  onSuccess?: (reservation: any) => void
  onCancel?: () => void
}

interface Closure {
  id: string
  closure_date: string
  closure_name: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

export default function AddReservation({ onSuccess, onCancel }: AddReservationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [reservationDetails, setReservationDetails] = useState<any>(null)
  const [closures, setClosures] = useState<Closure[]>([])
  const [tableConfigs, setTableConfigs] = useState<any[]>([])
  const [maxPartySize, setMaxPartySize] = useState(20)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      party_size: 2,
      reservation_date: format(new Date(), 'yyyy-MM-dd')
    }
  })

  // Fetch closures and table configurations data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch closures
        const timestamp = new Date().getTime()
        const closuresResponse = await fetch(`/api/closures?t=${timestamp}&r=${Math.random()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        })
        
        if (closuresResponse.ok) {
          const closuresData = await closuresResponse.json()
          setClosures(closuresData.closures || [])
        }

        // Fetch table configurations for admin (use admin auth)
        const configResponse = await fetch('/api/admin/table-config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          cache: 'no-store'
        })
        
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setTableConfigs(configData.table_configs?.filter((c: any) => c.is_active) || [])
          setMaxPartySize(configData.global_settings?.max_party_size || 20)
          
          // Set default party size to the smallest available if current default isn't available
          const availablePartySizes = configData.table_configs
            ?.filter((c: any) => c.is_active)
            ?.map((c: any) => c.party_size)
            ?.sort((a: number, b: number) => a - b) || []
          
          if (availablePartySizes.length > 0 && !availablePartySizes.includes(2)) {
            setValue('party_size', availablePartySizes[0])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [setValue])

  const selectedDate = watch('reservation_date')
  const selectedTime = watch('reservation_time')

  // Get available party sizes from table configurations
  const getAvailablePartySizes = () => {
    return tableConfigs
      .filter(config => config.is_active)
      .map(config => config.party_size)
      .sort((a, b) => a - b)
  }

  // Generate available dates (excluding all-day closures)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 90; i++) { // Extended range for admin
      const date = addDays(today, i)
      const dateString = format(date, 'yyyy-MM-dd')
      
      // Check if this date has an all-day closure
      const allDayClosure = closures.find(c => 
        c.closure_date === dateString && c.all_day === true
      )
      
      if (!allDayClosure) {
        dates.push({
          value: dateString,
          label: format(date, 'EEEE, MMMM do'),
          isToday: i === 0
        })
      }
    }
    
    return dates
  }

  // Check if a specific time slot is during a partial closure
  const isTimeSlotBlocked = (date: string, time: string) => {
    const dayClosures = closures.filter(c => c.closure_date === date)
    
    for (const closure of dayClosures) {
      if (closure.all_day) continue
      
      if (closure.start_time && closure.end_time) {
        if (time >= closure.start_time && time <= closure.end_time) {
          return true
        }
      }
    }
    
    return false
  }

  // Generate available time slots based on day of week
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return []
    
    const date = parseISO(selectedDate)
    const dayOfWeek = date.getDay()
    
    let startHour, endHour
    
    switch (dayOfWeek) {
      case 1: // Monday
      case 2: // Tuesday
        startHour = 10
        endHour = 16
        break
      case 3: // Wednesday
      case 4: // Thursday  
      case 0: // Sunday
        startHour = 10
        endHour = 20
        break
      case 5: // Friday
      case 6: // Saturday
        startHour = 10
        endHour = 21
        break
      default:
        startHour = 10
        endHour = 20
    }
    
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        if (!isTimeSlotBlocked(selectedDate, timeString)) {
          const displayTime = format(parseISO(`2000-01-01T${timeString}`), 'h:mm a')
          
          slots.push({
            value: timeString,
            label: displayTime
          })
        }
      }
    }
    
    return slots
  }

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true)
    
    try {
      // Format phone number
      if (data.phone) {
        data.phone = formatPhoneNumber(data.phone)
      }

      const response = await fetch('/api/admin/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create reservation')
      }

      // Success!
      setReservationDetails(result.reservation)
      setShowSuccess(true)
      toast.success('Reservation created successfully!')
      
      if (onSuccess) {
        onSuccess(result.reservation)
      }

      // Reset form
      reset()
      
    } catch (error) {
      console.error('Reservation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess && reservationDetails) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservation Created!</h2>
          <p className="text-gray-600">Admin-created reservation confirmed</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Reservation Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{reservationDetails.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {format(parseISO(reservationDetails.reservation_date), 'EEEE, MMMM do, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">
                {format(parseISO(`2000-01-01T${reservationDetails.reservation_time}`), 'h:mm a')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Party Size:</span>
              <span className="font-medium">{reservationDetails.party_size} people</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmation #:</span>
              <span className="font-medium">{reservationDetails.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Admin Note:</strong> This reservation was created through the admin console. 
            The customer will receive a confirmation email if their email was provided.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              setShowSuccess(false)
              setReservationDetails(null)
            }}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Another Reservation
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Add New Reservation</h2>
        </div>
        <p className="text-gray-600">Create a reservation through admin console</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Date Selection */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 mr-2" />
            Date
          </label>
          <select
            {...register('reservation_date')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a date</option>
            {getAvailableDates().map((date) => (
              <option key={date.value} value={date.value}>
                {date.label} {date.isToday && '(Today)'}
              </option>
            ))}
          </select>
          {errors.reservation_date && (
            <p className="text-red-500 text-sm mt-1">{errors.reservation_date.message}</p>
          )}
        </div>

        {/* Time Selection */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 mr-2" />
            Time
          </label>
          <select
            {...register('reservation_time')}
            disabled={!selectedDate}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select a time</option>
            {getAvailableTimeSlots().map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          {errors.reservation_time && (
            <p className="text-red-500 text-sm mt-1">{errors.reservation_time.message}</p>
          )}
          {!selectedDate && (
            <p className="text-gray-500 text-sm mt-1">Please select a date first</p>
          )}
        </div>

        {/* Party Size */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 mr-2" />
            Party Size
          </label>
          <select
            {...register('party_size', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {getAvailablePartySizes().length === 0 ? (
              <option value="">No party sizes available</option>
            ) : (
              getAvailablePartySizes().map((size) => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'person' : 'people'}
                </option>
              ))
            )}
            {/* Admin can still add larger parties if needed */}
            {getAvailablePartySizes().length > 0 && Math.max(...getAvailablePartySizes()) < maxPartySize && (
              <>
                <option disabled>--- Admin Override ---</option>
                {Array.from({ length: maxPartySize - Math.max(...getAvailablePartySizes()) }, (_, i) => {
                  const size = Math.max(...getAvailablePartySizes()) + i + 1
                  return (
                    <option key={`override-${size}`} value={size}>
                      {size} people (Admin Override)
                    </option>
                  )
                })}
              </>
            )}
          </select>
          {errors.party_size && (
            <p className="text-red-500 text-sm mt-1">{errors.party_size.message}</p>
          )}
          {getAvailablePartySizes().length === 0 && (
            <p className="text-orange-500 text-sm mt-1">
              No active table configurations. Admin can still create reservations.
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            {...register('name')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Customer's full name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="customer@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 mr-2" />
            Phone (Optional)
          </label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Special Requests */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 mr-2" />
            Special Requests (Optional)
          </label>
          <textarea
            {...register('special_requests')}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Allergies, dietary restrictions, special occasions, etc."
          />
          {errors.special_requests && (
            <p className="text-red-500 text-sm mt-1">{errors.special_requests.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Creating Reservation...' : 'Create Reservation'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Admin Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Admin Notes</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• This reservation will be marked as "confirmed" immediately</li>
            <li>• Customer will receive a confirmation email if email is provided</li>
            <li>• Restaurant will receive a notification email</li>
            <li>• Extended date range available (90 days) for admin bookings</li>
            <li>• No availability restrictions - admin can override slot limits</li>
          </ul>
        </div>
      </form>
    </div>
  )
}