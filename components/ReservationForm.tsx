'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [fetchCounter, setFetchCounter] = useState(0)
  
  // Refs to prevent stale closures in event handlers
  const globalSettingsRef = useRef(globalSettings)
  const lastFetchRef = useRef(0)
  const isMountedRef = useRef(true)

  // Update refs when state changes
  useEffect(() => {
    globalSettingsRef.current = globalSettings
  }, [globalSettings])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  // AGGRESSIVE data fetching with no rate limiting for real-time updates
  const fetchData = useCallback(async (force = false, source = 'unknown') => {
    if (!isMountedRef.current) return
    
    const now = Date.now()
    
    // Only apply rate limiting for non-forced updates
    if (!force && now - lastFetchRef.current < 1000) {
      console.log('🚫 ReservationForm: Rate limited fetch')
      return
    }
    
    console.log(`🔄 ReservationForm: Fetching data (${source})`, { 
      force, 
      counter: fetchCounter + 1,
      lastFetch: lastFetchRef.current ? new Date(lastFetchRef.current).toLocaleTimeString() : 'never'
    })
    
    lastFetchRef.current = now
    setLoading(true)
    setLastUpdateTimestamp(now)
    setFetchCounter(prev => prev + 1)
    
    try {
      // Ultra-aggressive cache busting
      const timestamp = now
      const random = Math.random().toString(36).substring(2, 15)
      const browserRandom = Math.floor(Math.random() * 1000000)
      const fetchId = `${timestamp}-${random}-${browserRandom}`
      
      console.log(`📡 Making API calls with fetchId: ${fetchId}`)
      
      // Fetch table configs with maximum cache busting
      const configUrl = `/api/table-config?_t=${timestamp}&_r=${random}&_br=${browserRandom}&_force=${force ? 1 : 0}&_counter=${fetchCounter}&_source=${encodeURIComponent(source)}&_fetchId=${fetchId}&_nocache=${Math.random()}`
      
      console.log('🔗 Config URL:', configUrl)
      
      const configResponse = await fetch(configUrl, {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Last-Modified': new Date(0).toUTCString(),
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'If-None-Match': '*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Cache-Buster': fetchId,
          'X-Force-Refresh': force ? '1' : '0',
          'X-Fetch-Source': source
        },
        cache: 'no-store'
      })
      
      console.log('📊 Config response:', configResponse.status, configResponse.headers.get('X-Timestamp'))
      
      if (configResponse.ok) {
        const configData = await configResponse.json()
        const activeConfigs = configData.table_configs?.filter((c: any) => c.is_active) || []
        const newGlobalSettings = configData.global_settings || {
          max_party_size: 10,
          slot_duration: 30,
          advance_booking_days: 30
        }
        
        console.log('✅ Config data received:', {
          activeConfigs: activeConfigs.length,
          oldSlotDuration: globalSettingsRef.current.slot_duration,
          newSlotDuration: newGlobalSettings.slot_duration,
          changed: newGlobalSettings.slot_duration !== globalSettingsRef.current.slot_duration,
          source: configData.source || 'unknown',
          timestamp: configData.timestamp
        })
        
        // Force update even if values seem the same
        setTableConfigs([...activeConfigs])
        setGlobalSettings({ ...newGlobalSettings })
        
        if (newGlobalSettings.slot_duration !== globalSettingsRef.current.slot_duration) {
          console.log(`🕒 SLOT DURATION CHANGED: ${globalSettingsRef.current.slot_duration} → ${newGlobalSettings.slot_duration}`)
          toast.success(`Time slots updated to ${newGlobalSettings.slot_duration} minute intervals`)
        }
        
      } else {
        console.error('❌ Config fetch failed:', configResponse.status, await configResponse.text())
        throw new Error(`Config API failed: ${configResponse.status}`)
      }
      
      // Fetch closures
      const closuresUrl = `/api/closures?_t=${timestamp}&_r=${random}&_br=${browserRandom}&_fetchId=${fetchId}`
      const closuresResponse = await fetch(closuresUrl, {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Cache-Buster': fetchId
        },
        cache: 'no-store'
      })
      
      if (closuresResponse.ok) {
        const closuresData = await closuresResponse.json()
        setClosures([...(closuresData.closures || [])])
        console.log(`✅ Closures updated (${closuresData.closures?.length || 0})`)
      } else {
        console.error('❌ Closures fetch failed:', closuresResponse.status)
        setClosures([])
      }
      
      setDataLoaded(true)
      
    } catch (error) {
      console.error('❌ ReservationForm fetch error:', error)
      // Don't set defaults on error - keep trying
      toast.error('Failed to update configuration - retrying...')
      
      // Retry after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchData(true, 'retry-after-error')
        }
      }, 2000)
      
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchCounter])

  // Initial data fetch
  useEffect(() => {
    console.log('🚀 ReservationForm: Mounting - initial fetch')
    fetchData(true, 'initial-mount')
  }, []) // Only on mount

  // AGGRESSIVE event listeners with immediate refresh
  useEffect(() => {
    const handleTableConfigUpdate = (event: CustomEvent) => {
      console.log('📡 IMMEDIATE: Table config update event received', event.detail)
      // Immediate refresh with no delay
      fetchData(true, 'table-config-event')
    }

    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log('📡 IMMEDIATE: Global refresh event received', event.detail)
      fetchData(true, 'global-refresh-event')
    }

    const handleClosureUpdate = (event: CustomEvent) => {
      console.log('📡 IMMEDIATE: Closure update event received', event.detail)
      fetchData(true, 'closure-update-event')
    }

    // Multiple event types to catch all updates
    const events = [
      'tableConfigUpdated',
      'globalRefresh', 
      'closureUpdated',
      'reservationUpdated',
      'adminConfigChange'
    ]

    events.forEach(eventType => {
      window.addEventListener(eventType, handleTableConfigUpdate as EventListener)
    })
    
    console.log('👂 ReservationForm: Event listeners attached for:', events.join(', '))
    
    return () => {
      events.forEach(eventType => {
        window.removeEventListener(eventType, handleTableConfigUpdate as EventListener)
      })
      console.log('🧹 ReservationForm: Event listeners cleaned up')
    }
  }, [fetchData])

  // Aggressive polling as backup (every 5 seconds)
  useEffect(() => {
    if (!dataLoaded) return
    
    console.log('⏰ Setting up aggressive polling every 5 seconds')
    
    const interval = setInterval(() => {
      console.log('⏰ Polling tick - checking for updates')
      fetchData(false, 'polling-interval')
    }, 5000) // Every 5 seconds
    
    return () => {
      clearInterval(interval)
      console.log('🧹 Polling cleaned up')
    }
  }, [dataLoaded, fetchData])

  const selectedDate = watch('reservation_date')
  const selectedTime = watch('reservation_time')

  // Get available party sizes
  const getAvailablePartySizes = () => {
    return tableConfigs
      .filter(config => config.is_active)
      .map(config => config.party_size)
      .sort((a, b) => a - b)
  }

  // Update default party size when configs change
  useEffect(() => {
    const availablePartySizes = getAvailablePartySizes()
    if (availablePartySizes.length > 0) {
      const currentPartySize = watch('party_size')
      if (!availablePartySizes.includes(currentPartySize)) {
        setValue('party_size', availablePartySizes[0])
        console.log(`🔄 Updated party size to ${availablePartySizes[0]}`)
      }
    }
  }, [tableConfigs, setValue, watch])

  // Generate available dates
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < globalSettings.advance_booking_days; i++) {
      const date = addDays(today, i)
      const dateString = format(date, 'yyyy-MM-dd')
      
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

  // Generate time slots with CURRENT slot duration
  const generateTimeSlots = useCallback((date: string, duration: number) => {
    if (!date) return []
    
    console.log(`🕒 Generating time slots: date=${date}, duration=${duration}min`)
    
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
        
        // Check closure conflicts
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
    
    console.log(`📏 Generated ${slots.length} time slots for ${date} with ${duration}min intervals`)
    return slots
  }, [closures])

  // FORCE time slot regeneration whenever globalSettings change
  useEffect(() => {
    console.log(`🔄 FORCING time slot regeneration: ${selectedDate} with ${globalSettings.slot_duration}min`)
    
    if (selectedDate) {
      const newSlots = generateTimeSlots(selectedDate, globalSettings.slot_duration)
      setAvailableTimeSlots([...newSlots]) // Force array recreation
      
      // Clear invalid time selection
      if (selectedTime && !newSlots.some(slot => slot.value === selectedTime)) {
        console.log(`⚠️ Clearing invalid time: ${selectedTime}`)
        setValue('reservation_time', '')
      }
    } else {
      setAvailableTimeSlots([])
    }
  }, [selectedDate, globalSettings.slot_duration, generateTimeSlots, selectedTime, setValue])

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true)
    
    try {
      const availablePartySizes = getAvailablePartySizes()
      if (!availablePartySizes.includes(data.party_size)) {
        throw new Error(`Sorry, tables for ${data.party_size} ${data.party_size === 1 ? 'person' : 'people'} are not currently available.`)
      }

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

      setReservationDetails(result.reservation)
      setShowSuccess(true)
      toast.success('Reservation confirmed! Check your email for details.')
      
      if (onSuccess) {
        onSuccess(result.reservation)
      }

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

  if (!dataLoaded && loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <div className="text-gray-600">Loading reservation system...</div>
          <div className="text-sm text-gray-500 mt-2">Fetching latest configuration...</div>
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
            <span className="text-sm">Syncing latest settings...</span>
          </div>
        )}
      </div>

      {/* Enhanced debug info with real-time updates */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <strong>🐛 Real-time Status:</strong>
          <div className="mt-1 space-y-1">
            <div><strong>Fetch #:</strong> {fetchCounter}</div>
            <div><strong>Slot Duration:</strong> <span className="font-bold text-blue-600">{globalSettings.slot_duration} minutes</span></div>
            <div><strong>Available Party Sizes:</strong> {availablePartySizes.join(', ') || 'None'}</div>
            <div><strong>Time Slots for Selected Date:</strong> {availableTimeSlots.length}</div>
            <div><strong>Last Update:</strong> {lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toLocaleTimeString() : 'Never'}</div>
            <div><strong>Data Loaded:</strong> {dataLoaded ? '✅' : '❌'}</div>
            <div><strong>Loading:</strong> {loading ? '🔄' : '✅'}</div>
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
              onClick={() => fetchData(true, 'manual-refresh-no-tables')}
              disabled={loading}
              className="mt-2 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Force Refresh'}
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
          {selectedDate && availableTimeSlots.length > 0 && (
            <p className="text-blue-600 text-sm mt-1 font-medium">
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
            <li>• <strong>Time slots are {globalSettings.slot_duration} minutes apart</strong></li>
            <li>• For larger parties or special arrangements, please call us directly</li>
            <li>• Confirmation email will be sent immediately</li>
          </ul>
        </div>

        {/* Manual Refresh Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => fetchData(true, 'manual-refresh-button')}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Force Refresh Settings'}
          </button>
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            <div>Last updated: {lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toLocaleTimeString() : 'Never'}</div>
            <div>Fetch count: {fetchCounter}</div>
            <div className="font-medium text-blue-600">Current slot duration: {globalSettings.slot_duration} minutes</div>
          </div>
        </div>

        {/* Real-time Status Indicator */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Real-time sync active</span>
            </div>
            <div className="text-xs text-green-600">
              Auto-refresh every 5s
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}