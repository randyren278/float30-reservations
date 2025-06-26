'use client'

import { useState, useEffect } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Phone, Mail } from 'lucide-react'

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

interface RestaurantClosure {
  id: string
  closure_date: string
  closure_name: string
  closure_reason?: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

interface AdminCalendarProps {
  onReservationClick?: (reservation: Reservation) => void
  onStatusUpdate?: (id: string, status: Reservation['status']) => void
}

export default function AdminCalendar({ onReservationClick, onStatusUpdate }: AdminCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [closures, setClosures] = useState<RestaurantClosure[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch reservations directly from API
  const fetchReservations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/reservations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const receivedReservations = data.reservations || []
        setReservations(receivedReservations)
      }
    } catch (error) {
      console.error('Calendar: Error fetching reservations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch closures from API
  const fetchClosures = async () => {
    try {
      const response = await fetch('/api/closures')
      
      if (response.ok) {
        const data = await response.json()
        setClosures(data.closures || [])
      }
    } catch (error) {
      console.error('Calendar: Error fetching closures:', error)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchReservations()
    fetchClosures()
  }, [])

  // Generate time slots based on day of week
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
      for (let minute = 0; minute < 60; minute += 30) { // Changed from 15 to 30
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    
    return slots
  }

  // Generate master time slots (10 AM to 9 PM for calendar display)
  useEffect(() => {
    const slots = []
    const startHour = 10 // 10 AM
    const endHour = 21   // 9 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // Changed from 15 to 30
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    
    setTimeSlots(slots)
  }, [])

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
    return closures.find(c => c.closure_date === dateStr)
  }

  // Check if a specific time slot is during a closure
  const isTimeSlotClosed = (date: Date, timeSlot: string) => {
    const closure = getDayClosure(date)
    if (!closure) return false
    
    // If it's an all-day closure, the entire day is closed
    if (closure.all_day) return true
    
    // For partial closures, check if time falls within closure period
    if (closure.start_time && closure.end_time) {
      const slotTime = timeSlot
      return slotTime >= closure.start_time && slotTime <= closure.end_time
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
    await handleStatusUpdate(reservationId, newStatus)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Loading Indicator */}
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-t-lg">
          <div className="text-blue-800 text-sm">
            🔄 Loading reservations...
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
              onClick={() => {
                fetchReservations()
                fetchClosures()
                goToCurrentWeek()
              }}
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
            Week of {format(weekStart, 'EEEE, MMMM d')}
          </p>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && reservations.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-2">Debug Info:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>Reservations loaded: {reservations.length}</div>
            <div>Sample reservation: {JSON.stringify(reservations[0], null, 2)}</div>
          </div>
        </div>
      )}

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
      </div>
    </div>
  )
}