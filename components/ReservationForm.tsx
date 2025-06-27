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
  const [globalSettings, setGlobalSettings] = useState({
    max_party_size: 10,
    slot_duration: 30,
    advance_booking_days: 30
  })
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{value: string, label: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0)

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

  // Enhanced data fetching function with better cache busting
  const fetchData = useCallback(async (force = false) => {
    const now = Date.now()
    
    // Prevent too frequent updates unless forced
    if (!force && now - lastUpdateTimestamp < 2000) {
      console.log('🚫 ReservationForm: Skipping fetch due to rate limiting')
      return
    }
    
    console.log('🔄 ReservationForm: Fetching data...', { force, loading, dataLoaded })
    setLoading(true)
    setLastUpdateTimestamp(now)
    
    try {
      // Enhanced cache busting with multiple parameters
      const timestamp = now
      const random = Math.random().toString(36).substring(7)
      const browserRandom = Math.floor(Math.random() * 1000000)
      
      // Fetch both APIs in parallel with aggressive cache busting
      const [configResponse, closuresResponse] = await Promise.all([
        fetch(`/api/table-config?t=${timestamp}&r=${random}&br=${browserRandom}&nocache=${Date.now()}&v=${Math.random()}&force=${force ? 1 : 0}`, {
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
        }),
        fetch(`/api/closures?t=${timestamp}&r=${random}&br=${browserRandom}&nocache=${Date.now()}&v=${Math.random()}&force=${force ? 1 : 0}`, {
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
      ])
      
      // Process table configurations
      if (configResponse.ok) {
        const configData = await configResponse.json()
        const activeConfigs = configData.table_configs?.filter((c: any) => c.is_active) || []
        const newGlobalSettings = configData.global_settings || globalSettings
        
        console.log('✅ ReservationForm: Updated configurations', {
          activeConfigs: activeConfigs.length,
          slotDuration: newGlobalSettings.slot_duration,
          oldSlotDuration: globalSettings.slot_duration
        })
        
        setTableConfigs(activeConfigs)
        setGlobalSettings(newGlobalSettings)
        
        // Force time slot regeneration if slot duration changed
        if (newGlobalSettings.slot_duration !== globalSettings.slot_duration) {
          console.log(`🕒 Slot duration changed: ${globalSettings.slot_duration} → ${newGlobalSettings.slot_duration}`)
          // Time slots will be regenerated in the useEffect below
        }
        
      } else {
        console.error('❌ Failed to fetch table configs:', configResponse.status)
        // Set safe defaults
        setTableConfigs([
          { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
          { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
          { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
          { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
          { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true }
        ])
      }
      
      // Process closures
      if (closuresResponse.ok) {
        const closuresData = await closuresResponse.json()
        setClosures(closuresData.closures || [])
        console.log(`✅ ReservationForm: Updated closures (${closuresData.closures?.length || 0})`)
      } else {
        console.error('❌ Failed to fetch closures:', closuresResponse.status)
        setClosures([])
      }
      
      setDataLoaded(true)
      
    } catch (error) {
      console.error('❌ ReservationForm: Error fetching data:', error)
      // Set defaults so the form still works
      setTableConfigs([
        { party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true },
        { party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true },
        { party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true },
        { party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true },
        { party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true }
      ])
      setClosures([])
      setDataLoaded(true)
    } finally {
      setLoading(false)
      console.log('🏁 ReservationForm: Data fetching completed')
    }
  }, [globalSettings, lastUpdateTimestamp, loading, dataLoaded])

  // Initial data fetch
  useEffect(() => {
    if (!dataLoaded) {
      console.log('🚀 ReservationForm: Initial data fetch')
      fetchData(true) // Force initial fetch
    }
  }, [dataLoaded, fetchData])

  // Listen for real-time updates from admin dashboard
  useEffect(() => {
    const handleTableConfigUpdate = (event: CustomEvent) => {
      console.log('📡 ReservationForm: Received table config update event', event.detail)
      // Force refresh when admin updates table configurations
      fetchData(true)
    }

    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log('📡 ReservationForm: Received global refresh event', event.detail)
      fetchData(true)
    }

    const handleClosureUpdate = (event: CustomEvent) => {
      console.log('📡 ReservationForm: Received closure update event', event.detail)
      fetchData(true)
    }

    // Listen to various update events
    window.addEventListener('tableConfigUpdated', handleTableConfigUpdate as EventListener)
    window.addEventListener('globalRefresh', handleGlobalRefresh as EventListener)
    window.addEventListener('closureUpdated', handleClosureUpdate as EventListener)
    
    return () => {
      window.removeEventListener('tableConfigUpdated', handleTableConfigUpdate as EventListener)
      window.removeEventListener('globalRefresh', handleGlobalRefresh as EventListener)
      window.removeEventListener('closureUpdated', handleClosureUpdate as EventListener)
    }
  }, [fetchData])

  // Set up periodic polling as backup (less frequent to avoid overloading)
  useEffect(() => {
    if (!dataLoaded) return
    
    console.log('⏰ ReservationForm: Setting up periodic polling...')
    
    const interval = setInterval(() => {
      console.log('⏰ ReservationForm: Periodic update check')
      fetchData(false) // Non-forced update
    }, 30000) // Poll every 30 seconds (less aggressive)
    
    return () => {
      clearInterval(interval)
      console.log('🧹 ReservationForm: Cleaned up polling interval')
    }
  }, [dataLoaded, fetchData])

  const selectedDate = watch('reservation_date')
  const selectedTime = watch('reservation_time')

  // Get available party sizes from table configurations
  const getAvailablePartySizes = () => {
    return tableConfigs
      .filter(config => config.is_active)
      .map(config => config.party_size)
      .sort((a, b) => a - b)
  }

  // Update default party size when table configs change
  useEffect(() => {
    const availablePartySizes = getAvailablePartySizes()
    if (availablePartySizes.length > 0) {
      const currentPartySize = watch('party_size')
      if (!availablePartySizes.includes(currentPartySize)) {
        setValue('party_size', availablePartySizes[0])
        console.log(`🔄 ReservationForm: Updated default party size to ${availablePartySizes[0]}`)
      }
    }
  }, [tableConfigs, setValue, watch])

  // Generate available dates (only exclude full-day closures)
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < globalSettings.advance_booking_days; i++) {
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

  // Generate available time slots based on day of week - FIXED to use current slot duration
  const generateTimeSlots = useCallback((date: string, duration: number) => {
    if (!date) return []
    
    console.log(`🕒 ReservationForm: Generating time slots for ${date} with ${duration}min duration`)
    
    const parsedDate = parseISO(date)
    const dayOfWeek = parsedDate.getDay()
    
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
      for (let minute = 0; minute < 60; minute += duration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Check if this time slot is blocked by a partial closure
        const dayClosures = closures.filter(c => c.closure_date === date)
        let isBlocked = false
        
        for (const closure of dayClosures) {
          if (closure.all_day) continue
          
          if (closure.start_time && closure.end_time) {
            if (timeString >= closure.start_time && timeString <= closure.end_time) {
              isBlocked = true
              break
            }
          }
        }
        
        if (!isBlocked) {
          const displayTime = format(parseISO(`2000-01-01T${timeString}`), 'h:mm a')
          
          slots.push({
            value: timeString,
            label: displayTime
          })
        }
      }
    }
    
    console.log(`📏 ReservationForm: Generated ${slots.length} time slots for ${date}`)
    return slots
  }, [closures])

  // Update time slots whenever date, slot duration, or closures change
  useEffect(() => {
    console.log(`🔄 ReservationForm: Updating time slots for ${selectedDate} with ${globalSettings.slot_duration}min duration`)
    const newSlots = generateTimeSlots(selectedDate, globalSettings.slot_duration)
    setAvailableTimeSlots(newSlots)
    
    // If current selected time is no longer available, clear it
    if (selectedTime && !newSlots.some(slot => slot.value === selectedTime)) {
      console.log(`⚠️ ReservationForm: Clearing invalid time selection: ${selectedTime}`)
      setValue('reservation_time', '')
    }
  }, [selectedDate, globalSettings.slot_duration, generateTimeSlots, selectedTime, setValue])

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

  // Show loading only if we haven't loaded data yet AND we're currently loading
  if (!dataLoaded && loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <div className="text-gray-600">Loading reservation system...</div>
          <div className="text-sm text-gray-500 mt-2">This should only take a moment</div>
        </div>
      </div>
    )
  }

  const availablePartySizes = getAvailablePartySizes()

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Make a Reservation</h2>
        <p className="text-gray-600">Float 30 Restaurant</p>
        
        {loading && (
          <div className="mt-2 flex items-center justify-center text-blue-600">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm">Updating configuration...</span>
          </div>
        )}
      </div>

      {/* Enhanced debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <strong>🐛 Status:</strong>
          <div className="mt-1 space-y-1">
            <div><strong>Data loaded:</strong> {dataLoaded ? 'Yes' : 'No'}</div>
            <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
            <div><strong>Closures:</strong> {closures.length} loaded</div>
            <div><strong>Table configs:</strong> {tableConfigs.length} active</div>
            <div><strong>Available party sizes:</strong> {availablePartySizes.join(', ') || 'None'}</div>
            <div><strong>Slot duration:</strong> {globalSettings.slot_duration} minutes</div>
            <div><strong>Time slots for selected date:</strong> {availableTimeSlots.length}</div>
            <div><strong>Last update:</strong> {new Date(lastUpdateTimestamp).toLocaleTimeString()}</div>
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
              onClick={() => fetchData(true)}
              disabled={loading}
              className="mt-2 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Configuration'}
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
            {availableTimeSlots.map((slot) => (
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
          {selectedDate && availableTimeSlots.length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              No time slots available for this date. The restaurant may be closed.
            </p>
          )}
          {selectedDate && (
            <p className="text-blue-500 text-sm mt-1">
              Time slots: {globalSettings.slot_duration} minute intervals
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
            <li>• Reservations can be made up to {globalSettings.advance_booking_days} days in advance</li>
            <li>• We're open 7 days a week with varying hours</li>
            <li>• Mon-Tue: 10am-4pm | Wed-Thu & Sun: 10am-8pm | Fri-Sat: 10am-9pm</li>
            {availablePartySizes.length > 0 ? (
              <li>• Available for parties of: {availablePartySizes.join(', ')} {availablePartySizes.length === 1 ? 'person' : 'people'}</li>
            ) : (
              <li className="text-red-600">• Currently no table sizes are available for online booking</li>
            )}
            <li>• Time slots are {globalSettings.slot_duration} minutes apart</li>
            <li>• For larger parties or special arrangements, please call us directly</li>
            <li>• Confirmation email will be sent immediately</li>
          </ul>
        </div>

        {/* Manual Refresh Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Configuration'}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </form>
    </div>
  )
}