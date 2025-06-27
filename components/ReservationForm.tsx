'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addDays, parseISO } from 'date-fns'
import { Calendar, Clock, Users, Mail, Phone, MessageSquare, CheckCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { reservationSchema, type ReservationFormData } from '@/lib/validation'
import { formatPhoneNumber } from '@/lib/validation'

interface ReservationFormProps {
  availableSlots?: { date: string; time: string; available: boolean }[]
  onSuccess?: (reservation: any) => void
}

interface Closure {
  id: string
  closure_date: string
  closure_name: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

interface TableConfiguration {
  party_size: number
  table_count: number
  max_reservations_per_slot: number
  is_active: boolean
}

export default function ReservationForm({ availableSlots, onSuccess }: ReservationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [reservationDetails, setReservationDetails] = useState<any>(null)
  const [closures, setClosures] = useState<Closure[]>([])
  const [tableConfigs, setTableConfigs] = useState<TableConfiguration[]>([])
  const [maxPartySize, setMaxPartySize] = useState(10)
  const [slotDuration, setSlotDuration] = useState(30)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  // Force refresh function for table configurations
  const forceRefreshTableConfigs = useCallback(async () => {
    console.log('🔄 ReservationForm: Force refreshing table configurations...')
    setRefreshing(true)
    
    try {
      const timestamp = new Date().getTime()
      const random = Math.random().toString(36).substring(7)
      const browserRandom = Math.floor(Math.random() * 1000000)
      const url = `/api/table-config?t=${timestamp}&r=${random}&br=${browserRandom}&force=true&nocache=${Date.now()}&v=${Math.random()}`
      
      console.log('Fetching table configs from:', url)
      
      const configResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Last-Modified': new Date(0).toUTCString(),
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'If-None-Match': '*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Cache-Buster': timestamp.toString(),
          'Accept': 'application/json, */*'
        },
        cache: 'no-store'
      })
      
      console.log('Table config API response status:', configResponse.status)
      
      if (configResponse.ok) {
        const configData = await configResponse.json()
        console.log('Fresh table config data received:', configData)
        
        const activeConfigs = configData.table_configs?.filter((c: TableConfiguration) => c.is_active) || []
        setTableConfigs(activeConfigs)
        setMaxPartySize(configData.global_settings?.max_party_size || 10)
        setSlotDuration(configData.global_settings?.slot_duration || 30)
        
        console.log(`✅ Updated table configs: ${activeConfigs.length} active configurations`)
        
        // Update default party size if needed
        const availablePartySizes = activeConfigs
          .map((c: TableConfiguration) => c.party_size)
          .sort((a: number, b: number) => a - b)
        
        if (availablePartySizes.length > 0) {
          const currentPartySize = watch('party_size')
          if (!availablePartySizes.includes(currentPartySize)) {
            setValue('party_size', availablePartySizes[0])
            console.log(`Updated default party size to ${availablePartySizes[0]}`)
          }
        }
        
      } else {
        console.error('Failed to fetch table configs:', configResponse.status)
      }
    } catch (error) {
      console.error('❌ Error refreshing table configs:', error)
    } finally {
      setRefreshing(false)
    }
  }, [setValue, watch])

  // Fetch table configurations and closures
  const fetchData = useCallback(async () => {
    console.log('🚀 ReservationForm: Fetching initial data...')
    setLoading(true)
    
    try {
        // Fetch closures
        const timestamp = new Date().getTime()
        const random = Math.random().toString(36).substring(7)
        const browserRandom = Math.floor(Math.random() * 1000000)
        const closuresResponse = await fetch(`/api/closures?t=${timestamp}&r=${random}&br=${browserRandom}&nocache=${Date.now()}&v=${Math.random()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date(0).toUTCString(),
            'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
            'If-None-Match': '*',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Cache-Buster': timestamp.toString()
          },
          cache: 'no-store'
        })
      
      if (closuresResponse.ok) {
        const closuresData = await closuresResponse.json()
        setClosures(closuresData.closures || [])
        console.log(`📅 Loaded ${closuresData.closures?.length || 0} closures`)
      }

      // Fetch table configurations
      await forceRefreshTableConfigs()
      
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      toast.error('Error loading configuration data')
    } finally {
      setLoading(false)
    }
  }, [forceRefreshTableConfigs])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for table configuration updates from admin
  useEffect(() => {
    const handleTableConfigUpdate = (event: CustomEvent) => {
      console.log('📡 ReservationForm: Received table config update event')
      forceRefreshTableConfigs()
    }

    // Listen for custom events
    window.addEventListener('tableConfigUpdated', handleTableConfigUpdate as EventListener)

    return () => {
      window.removeEventListener('tableConfigUpdated', handleTableConfigUpdate as EventListener)
    }
  }, [forceRefreshTableConfigs])

  const selectedDate = watch('reservation_date')
  const selectedTime = watch('reservation_time')

  // Get available party sizes from table configurations
  const getAvailablePartySizes = () => {
    const sizes = tableConfigs
      .filter(config => config.is_active)
      .map(config => config.party_size)
      .sort((a, b) => a - b)
    
    console.log('Available party sizes:', sizes)
    return sizes
  }

  // Generate available dates (only exclude full-day closures)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    console.log('ReservationForm: Generating available dates, closures:', closures.length)
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i)
      const dateString = format(date, 'yyyy-MM-dd')
      
      // Check if this date has an all-day closure
      const allDayClosure = closures.find(c => {
        const matches = c.closure_date === dateString && c.all_day === true
        if (matches) {
          console.log(`ReservationForm: Found all-day closure for ${dateString}:`, c.closure_name)
        }
        return matches
      })
      
      // Only skip dates with all-day closures
      if (!allDayClosure) {
        dates.push({
          value: dateString,
          label: format(date, 'EEEE, MMMM do'),
          isToday: i === 0
        })
      } else {
        console.log(`ReservationForm: Skipping date ${dateString} due to all-day closure:`, allDayClosure.closure_name)
      }
    }
    
    console.log(`ReservationForm: Generated ${dates.length} available dates`)
    return dates
  }

  // Check if a specific time slot is during a partial closure
  const isTimeSlotBlocked = (date: string, time: string) => {
    const dayClosures = closures.filter(c => c.closure_date === date)
    
    for (const closure of dayClosures) {
      // Skip all-day closures (already handled in date filtering)
      if (closure.all_day) continue
      
      // Check if time falls within partial closure
      if (closure.start_time && closure.end_time) {
        if (time >= closure.start_time && time <= closure.end_time) {
          console.log('ReservationForm: Time slot blocked by partial closure:', { 
            date, 
            time, 
            closure: closure.closure_name 
          })
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
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    
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
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Check if this time slot is blocked by a partial closure
        if (!isTimeSlotBlocked(selectedDate, timeString)) {
          const displayTime = format(parseISO(`2000-01-01T${timeString}`), 'h:mm a')
          
          slots.push({
            value: timeString,
            label: displayTime
          })
        } else {
          console.log(`ReservationForm: Skipping blocked time slot ${timeString}`)
        }
      }
    }
    
    console.log(`ReservationForm: Generated ${slots.length} time slots for ${selectedDate}`)
    return slots
  }

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true)
    
    try {
      // Check if the selected party size is available
      const availablePartySizes = getAvailablePartySizes()
      if (!availablePartySizes.includes(data.party_size)) {
        throw new Error(`Sorry, tables for ${data.party_size} ${data.party_size === 1 ? 'person' : 'people'} are not currently available.`)
      }

      // Format phone number
      if (data.phone) {
        data.phone = formatPhoneNumber(data.phone)
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      toast.success('Reservation confirmed! Check your email for details.')
      
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h2>
          <p className="text-gray-600">Thank you for choosing Float 30 Restaurant</p>
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
            <strong>Confirmation email sent!</strong> Please check your email for complete details and important information about your reservation.
          </p>
        </div>

        <button
          onClick={() => {
            setShowSuccess(false)
            setReservationDetails(null)
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Make Another Reservation
        </button>
      </div>
    )
  }

  const availablePartySizes = getAvailablePartySizes()

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <div className="text-gray-600">Loading reservation system...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Make a Reservation</h2>
        <p className="text-gray-600">Float 30 Restaurant</p>
        
        {refreshing && (
          <div className="mt-2 flex items-center justify-center text-blue-600">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm">Updating configurations...</span>
          </div>
        )}
      </div>

      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <strong>🐛 Debug:</strong> {closures.length} closures, {tableConfigs.length} table configs
          {availablePartySizes.length > 0 && (
            <div className="mt-1">
              <strong>Available party sizes:</strong> {availablePartySizes.join(', ')}
            </div>
          )}
          <div className="mt-1">
            <strong>Max party size:</strong> {maxPartySize}
          </div>
        </div>
      )}

      {/* Warning if no party sizes available */}
      {availablePartySizes.length === 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 text-sm">
            <strong>⚠️ No tables currently available for booking.</strong>
            <p className="mt-1">Please contact the restaurant directly to make a reservation.</p>
            <button
              onClick={() => forceRefreshTableConfigs()}
              className="mt-2 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors"
            >
              Refresh Configuration
            </button>
          </div>
        </div>
      )}

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
          {/* Show closure info for selected date */}
          {selectedDate && closures.some(c => c.closure_date === selectedDate && !c.all_day) && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              <strong>Note:</strong> Some time slots may be unavailable due to partial closure.
            </div>
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
          {selectedDate && getAvailableTimeSlots().length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              No time slots available for this date. The restaurant may be closed.
            </p>
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
            disabled={availablePartySizes.length === 0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {availablePartySizes.length === 0 ? (
              <option value="">No party sizes available</option>
            ) : (
              availablePartySizes.map((size) => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'person' : 'people'}
                </option>
              ))
            )}
          </select>
          {errors.party_size && (
            <p className="text-red-500 text-sm mt-1">{errors.party_size.message}</p>
          )}
          {availablePartySizes.length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              No table configurations are currently active. Please contact the restaurant.
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
            placeholder="Your full name"
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
            placeholder="your.email@example.com"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || availablePartySizes.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSubmitting ? 'Creating Reservation...' : 
           availablePartySizes.length === 0 ? 'No Tables Available' : 
           'Confirm Reservation'}
        </button>

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Important Information</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Please arrive on time - tables may be released after 15 minutes</li>
            <li>• Reservations can be made up to 30 days in advance</li>
            <li>• We're open 7 days a week with varying hours</li>
            <li>• Mon-Tue: 10am-4pm | Wed-Thu & Sun: 10am-8pm | Fri-Sat: 10am-9pm</li>
            {availablePartySizes.length > 0 ? (
              <li>• Available for parties of: {availablePartySizes.join(', ')} {availablePartySizes.length === 1 ? 'person' : 'people'}</li>
            ) : (
              <li className="text-red-600">• Currently no table sizes are available for online booking</li>
            )}
            <li>• For larger parties or special arrangements, please call us directly</li>
            <li>• Confirmation email will be sent immediately</li>
          </ul>
        </div>

        {/* Manual Refresh Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading || refreshing}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading || refreshing ? 'Refreshing...' : 'Refresh Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}