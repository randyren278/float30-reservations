'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Phone, Mail, RefreshCw } from 'lucide-react'
import { useClosures, useGlobalSettings } from '@/hooks/useRealtimeSync'

interface Reservation {
  id: string
  name: string
  email: string
  phone?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  created_at: string
}

interface AdminCalendarProps {
  onReservationClick?: (reservation: Reservation) => void
  onStatusUpdate?: (id: string, status: Reservation['status']) => void
}

export default function AdminCalendar({ onReservationClick, onStatusUpdate }: AdminCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Use real-time sync hooks
  const {
    closures,
    loading: closuresLoading,
    error: closuresError
  } = useClosures({
    enablePolling: true,
    pollingInterval: 5000,
    enableEventListeners: true
  })

  const {
    settings: globalSettings,
    slotDuration
  } = useGlobalSettings({
    enablePolling: true,
    pollingInterval: 3000,
    enableEventListeners: true
  })

  // Fetch reservations directly from API with real-time polling
  const fetchReservations = useCallback(async () => {
    try {
      const timestamp = new Date().getTime()
      const random = Math.random().toString(36).substring(7)
      const browserRandom = Math.floor(Math.random() * 1000000)
      const url = `/api/admin/reservations?t=${timestamp}&r=${random}&br=${browserRandom}&nocache=${Date.now()}&v=${Math.random()}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`,
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
      
      if (response.ok) {
        const data = await response.json()
        const receivedReservations = data.reservations || []
        setReservations(receivedReservations)
        console.log(`📅 AdminCalendar: Fetched ${receivedReservations.length} reservations`)
      }
    } catch (error) {
      console.error('AdminCalendar: Error fetching reservations:', error)
    }
  }, [])

  // Set up real-time polling for reservations
  useEffect(() => {
    console.log('🚀 AdminCalendar: Setting up real-time reservation polling')
    
    // Fetch immediately
    fetchReservations()
    
    // Set up polling every 5 seconds for real-time updates
    const reservationPolling = setInterval(() => {
      fetchReservations()
    }, 5000)
    
    return () => {
      console.log('🧹 AdminCalendar: Cleaning up reservation polling')
      clearInterval(reservationPolling)
    }
  }, [fetchReservations])

  // Listen for manual refresh events
  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('📡 AdminCalendar: Received global refresh event')
      fetchReservations()
    }
    
    const handleReservationUpdate = () => {
      console.log('📡 AdminCalendar: Received reservation update event')
      fetchReservations()
    }
    
    // Listen to various update events
    window.addEventListener('globalRefresh', handleGlobalRefresh)
    window.addEventListener('reservationUpdated', handleReservationUpdate)
    window.addEventListener('reservationCreated', handleReservationUpdate)
    window.addEventListener('reservationStatusChanged', handleReservationUpdate)
    
    return () => {
      window.removeEventListener('globalRefresh', handleGlobalRefresh)
      window.removeEventListener('reservationUpdated', handleReservationUpdate)
      window.removeEventListener('reservationCreated', handleReservationUpdate)
      window.removeEventListener('reservationStatusChanged', handleReservationUpdate)
    }
  }, [fetchReservations])

  // Generate time slots based on slot duration (with real-time updates)
  useEffect(() => {
    console.log(`🕒 AdminCalendar: Updating time slots with ${slotDuration}min duration`)
    
    const slots = []
    const startHour = 10 // 10 AM
    const endHour = 21   // 9 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    
    setTimeSlots(slots)
    console.log(`📏 AdminCalendar: Generated ${slots.length} time slots`)
  }, [slotDuration])

  // Generate time slots for a specific day based on day of week
  const getTimeSlotsForDay = (dayOfWeek: number) => {
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
        slots.push(timeString)
      }
    }
    
    return slots
  }

  // Get the week range
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Filter out no days (restaurant is open 7 days a week)
  const openDays = weekDays

  // Navigation functions
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const goToCurrentWeek = () => setCurrentWeek(new Date())

  // Refresh reservations (called when status is updated)
  const handleStatusUpdate = async (id: string, status: Reservation['status']) => {
    if (onStatusUpdate) {
      await onStatusUpdate(id, status)
      // Refresh calendar data after status update
      await fetchReservations()
    }
  }

  // Check if a day is closed
  const getDayClosure = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    console.log(`🔍 Checking closure for date: ${dateStr}`)
    console.log('📋 Available closures:', closures.map(c => ({ 
      date: c.closure_date, 
      name: c.closure_name,
      id: c.id 
    })))
    
    const closure = closures.find(c => c.closure_date === dateStr)
    if (closure) {
      console.log(`🚫 Found closure for ${dateStr}:`, closure)
    } else {
      console.log(`✅ No closure found for ${dateStr}`)
    }
    
    return closure
  }

  // Check if a specific time slot is during a closure
  const isTimeSlotClosed = (date: Date, timeSlot: string) => {
    const closure = getDayClosure(date)
    if (!closure) return false
    
    console.log('🕐 Checking time slot closure:', { 
      date: format(date, 'yyyy-MM-dd'), 
      timeSlot, 
      closure: closure.closure_name,
      allDay: closure.all_day,
      startTime: closure.start_time,
      endTime: closure.end_time
    })
    
    // If it's an all-day closure, the entire day is closed
    if (closure.all_day) {
      console.log('🚫 All-day closure detected')
      return true
    }
    
    // For partial closures, check if time falls within closure period
    if (closure.start_time && closure.end_time) {
      const slotTime = timeSlot
      const isClosed = slotTime >= closure.start_time && slotTime <= closure.end_time
      console.log('⏰ Partial closure check:', { slotTime, startTime: closure.start_time, endTime: closure.end_time, isClosed })
      return isClosed
    }
    
    return false
  }

  // Get reservations for a specific date and time
  const getReservationsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const matchingReservations = reservations.filter(r => {
      // Handle potential time format differences (with or without seconds)
      const reservationTime = r.reservation_time.substring(0, 5) // Take only HH:MM part
      const targetTime = time
      
      const dateMatch = r.reservation_date === dateStr
      const timeMatch = reservationTime === targetTime
      const statusMatch = r.status !== 'cancelled'
      
      return dateMatch && timeMatch && statusMatch
    })
    
    return matchingReservations
  }

  // Get status color
  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800'
      case 'completed': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'no_show': return 'bg-orange-100 border-orange-300 text-orange-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Quick status update
  const handleQuickStatusUpdate = async (e: React.MouseEvent, reservationId: string, newStatus: Reservation['status']) => {
    e.stopPropagation()
    console.log('Calendar quick status update:', { reservationId, newStatus })
    
    try {
      await handleStatusUpdate(reservationId, newStatus)
    } catch (error) {
      console.error('Quick status update failed:', error)
    }
  }

  // Manual refresh button handler
  const handleManualRefresh = async () => {
    console.log('🔄 AdminCalendar: Manual refresh triggered')
    setLoading(true)
    try {
      await fetchReservations()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Loading Indicator */}
      {(loading || refreshing || closuresLoading) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-t-lg">
          <div className="text-blue-800 text-sm flex items-center">
            <RefreshCw className={`w-4 h-4 mr-2 ${(loading || refreshing || closuresLoading) ? 'animate-spin' : ''}`} />
            {closuresLoading ? 'Syncing closures...' : 'Loading reservations...'}
          </div>
        </div>
      )}

      {/* Error Display */}
      {closuresError && (
        <div className="p-4 bg-red-50 border border-red-200">
          <div className="text-red-800 text-sm">
            <strong>Sync Error:</strong> {closuresError}
          </div>
        </div>
      )}

      {/* Debug info for closures */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200">
          <div className="text-sm text-yellow-800">
            <strong>🐛 Real-time Status:</strong> {closures.length} closures loaded, slot duration: {slotDuration}min
            {closures.length > 0 && (
              <div className="mt-1 space-y-1">
                <div><strong>Closure dates:</strong> {closures.map(c => c.closure_date).join(', ')}</div>
                <div><strong>Closure details:</strong></div>
                {closures.map((c, i) => (
                  <div key={c.id} className="ml-4 text-xs">
                    {i + 1}. {c.closure_date} - {c.closure_name} 
                    {c.all_day ? ' (All day)' : ` (${c.start_time}-${c.end_time})`}
                    <span className="text-gray-600 ml-2">ID: {c.id.substring(0, 8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Weekly Calendar View</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleManualRefresh}
              disabled={loading || refreshing}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={goToNextWeek}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Week of {format(weekStart, 'EEEE, MMMM d')} | Slot Duration: {slotDuration} minutes
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Day Headers */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="p-3 text-sm font-medium text-gray-600 border-r border-gray-200">
              Time
            </div>
            {openDays.map((day) => {
              const dayClosure = getDayClosure(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                    dayClosure ? 'bg-red-50 border-red-200' : ''
                  }`}
                >
                  <div className={`text-sm font-medium ${dayClosure ? 'text-red-700' : 'text-gray-900'}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold mt-1 ${dayClosure ? 'text-red-800' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className={`text-xs ${dayClosure ? 'text-red-600' : 'text-gray-500'}`}>
                    {format(day, 'MMM')}
                  </div>
                  {dayClosure && (
                    <div className="text-xs font-medium text-red-700 mt-1">
                      CLOSED
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time Slots */}
          <div className="max-h-96 overflow-y-auto">
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                className="grid grid-cols-8 border-b border-gray-100 hover:bg-gray-50"
              >
                {/* Time Column */}
                <div className="p-3 text-sm font-medium text-gray-600 border-r border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {format(parseISO(`2000-01-01T${timeSlot}`), 'h:mm a')}
                  </div>
                </div>
                
                {/* Day Columns */}
                {openDays.map((day) => {
                  const dayOfWeek = day.getDay()
                  const validSlotsForDay = getTimeSlotsForDay(dayOfWeek)
                  const isValidSlot = validSlotsForDay.includes(timeSlot)
                  const isTimeSlotClosedForDay = isTimeSlotClosed(day, timeSlot)
                  const dayReservations = (isValidSlot && !isTimeSlotClosedForDay) ? getReservationsForSlot(day, timeSlot) : []
                  const isToday = isSameDay(day, new Date())
                  const dayClosure = getDayClosure(day)
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${timeSlot}`}
                      className={`p-1 border-r border-gray-200 last:border-r-0 min-h-[60px] ${
                        isToday ? 'bg-blue-50' : ''
                      } ${!isValidSlot ? 'bg-gray-100' : ''} ${
                        isTimeSlotClosedForDay ? 'bg-red-100' : ''
                      }`}
                    >
                      {!isValidSlot ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                          <div className="text-xs">Closed</div>
                        </div>
                      ) : isTimeSlotClosedForDay ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs font-medium text-red-700">
                              {dayClosure?.all_day ? 'CLOSED' : 'HOLIDAY'}
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                              {dayClosure?.closure_name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {dayReservations.map((reservation) => (
                            <div
                              key={reservation.id}
                              onClick={() => onReservationClick?.(reservation)}
                              className={`
                                p-2 mb-1 rounded-md border cursor-pointer transition-all hover:shadow-sm
                                ${getStatusColor(reservation.status)}
                              `}
                            >
                              <div className="text-xs font-medium truncate">
                                {reservation.name}
                              </div>
                              <div className="flex items-center text-xs text-gray-600 mt-1">
                                <Users className="w-3 h-3 mr-1" />
                                <span>{reservation.party_size}</span>
                                {reservation.special_requests && (
                                  <span className="ml-1 text-orange-600">⚠</span>
                                )}
                              </div>
                              
                              {/* Quick Action Buttons */}
                              {reservation.status === 'confirmed' && (
                                <div className="flex space-x-1 mt-1">
                                  <button
                                    onClick={(e) => handleQuickStatusUpdate(e, reservation.id, 'completed')}
                                    className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    title="Mark Complete"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={(e) => handleQuickStatusUpdate(e, reservation.id, 'no_show')}
                                    className="text-xs px-1 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-700"
                                    title="Mark No Show"
                                  >
                                    ✗
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Empty slot indicator */}
                          {dayReservations.length === 0 && (
                            <div className="h-full flex items-center justify-center text-gray-300">
                              <div className="text-xs">—</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>Legend:</strong> Click reservations for details • Quick actions: ✓ Complete, ✗ No Show
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-1"></div>
              <span>No Show</span>
            </div>
            <div className="flex items-center text-orange-600">
              <span>⚠</span>
              <span className="ml-1">Special Requests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week Summary */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {reservations.filter(r => {
                const rDate = parseISO(r.reservation_date)
                return rDate >= weekStart && rDate <= weekEnd && r.status !== 'cancelled'
              }).length}
            </div>
            <div className="text-sm text-blue-800">Total Reservations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {reservations.filter(r => {
                const rDate = parseISO(r.reservation_date)
                return rDate >= weekStart && rDate <= weekEnd && r.status === 'confirmed'
              }).length}
            </div>
            <div className="text-sm text-green-800">Confirmed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {reservations.filter(r => {
                const rDate = parseISO(r.reservation_date)
                return rDate >= weekStart && rDate <= weekEnd && r.status === 'completed'
              }).length}
            </div>
            <div className="text-sm text-blue-800">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {closures.filter(c => {
                const cDate = parseISO(c.closure_date)
                return cDate >= weekStart && cDate <= weekEnd
              }).length}
            </div>
            <div className="text-sm text-red-800">Closures</div>
          </div>
        </div>
        
        {/* Show closure details if any in current week */}
        {closures.filter(c => {
          const cDate = parseISO(c.closure_date)
          return cDate >= weekStart && cDate <= weekEnd
        }).length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-300">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Closures This Week:</h4>
            <div className="space-y-1">
              {closures.filter(c => {
                const cDate = parseISO(c.closure_date)
                return cDate >= weekStart && cDate <= weekEnd
              }).map(closure => (
                <div key={closure.id} className="text-sm text-red-700 bg-red-100 rounded px-2 py-1">
                  <strong>{format(parseISO(closure.closure_date), 'EEE, MMM d')}</strong> - {closure.closure_name}
                  {!closure.all_day && closure.start_time && closure.end_time && (
                    <span className="ml-2 text-red-600">
                      ({format(parseISO(`2000-01-01T${closure.start_time}`), 'h:mm a')} - {format(parseISO(`2000-01-01T${closure.end_time}`), 'h:mm a')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time status indicator */}
        <div className="mt-4 pt-4 border-t border-blue-300">
          <div className="text-xs text-blue-700">
            <strong>Real-time Status:</strong> 
            <span className="ml-2">
              Polling active • Last update: {new Date().toLocaleTimeString()} • 
              Slot duration: {slotDuration}min • 
              {closures.length} closures loaded
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}