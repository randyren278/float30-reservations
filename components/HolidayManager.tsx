'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { Calendar, Plus, Trash2, Clock, AlertTriangle, Users, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

interface RestaurantClosure {
  id: string
  closure_date: string
  closure_name: string
  closure_reason?: string
  all_day: boolean
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

interface ConflictingReservation {
  id: string
  name: string
  email: string
  reservation_time: string
  party_size: number
  special_requests?: string
}

interface HolidayManagerProps {
  onClosureUpdate?: () => void
}

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  conflictingReservations: ConflictingReservation[]
  closureDetails: {
    closure_name: string
    closure_date: string
    all_day: boolean
    start_time?: string
    end_time?: string
  }
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  conflictingReservations, 
  closureDetails 
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const formatTime = (time: string) => {
    try {
      return format(parseISO(`2000-01-01T${time}`), 'h:mm a')
    } catch {
      return time
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-orange-50">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Reservation Conflicts Detected</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Closure Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Proposed Closure</h3>
            <div className="text-red-800">
              <div><strong>{closureDetails.closure_name}</strong></div>
              <div>{format(parseISO(closureDetails.closure_date), 'EEEE, MMMM do, yyyy')}</div>
              {!closureDetails.all_day && closureDetails.start_time && closureDetails.end_time && (
                <div>
                  {formatTime(closureDetails.start_time)} - {formatTime(closureDetails.end_time)}
                </div>
              )}
              {closureDetails.all_day && <div>All Day Closure</div>}
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div className="text-yellow-800">
                <p className="font-medium">
                  Creating this closure will automatically cancel {conflictingReservations.length} existing reservation{conflictingReservations.length !== 1 ? 's' : ''}.
                </p>
                <p className="mt-1 text-sm">
                  Affected customers will receive automatic cancellation emails. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Conflicting Reservations List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Reservations that will be cancelled ({conflictingReservations.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-3">
              {conflictingReservations.map((reservation) => (
                <div key={reservation.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium">{reservation.name}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({reservation.party_size} {reservation.party_size === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-3 h-3 mr-2" />
                        <span>{formatTime(reservation.reservation_time)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-3 h-3 mr-2" />
                        <span>{reservation.email}</span>
                      </div>
                      
                      {reservation.special_requests && (
                        <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded">
                          <strong>Special Requests:</strong> {reservation.special_requests}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      ID: {reservation.id.substring(0, 8)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Confirmation Required:</strong> This will cancel all listed reservations and send cancellation emails.
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm & Cancel Reservations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to broadcast closure events to other components
const broadcastClosureEvent = (eventType: 'created' | 'updated' | 'deleted', closureData?: any) => {
  console.log(`📡 Broadcasting closure event: ${eventType}`, closureData)
  
  // Dispatch custom events that other components can listen to
  window.dispatchEvent(new CustomEvent(`closure${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
    detail: closureData
  }))
  
  // Also dispatch a generic closureUpdated event
  window.dispatchEvent(new CustomEvent('closureUpdated', {
    detail: { type: eventType, data: closureData }
  }))
}

export default function HolidayManager({ onClosureUpdate }: HolidayManagerProps) {
  const [closures, setClosures] = useState<RestaurantClosure[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    closure_date: '',
    closure_name: '',
    closure_reason: '',
    all_day: true,
    start_time: '',
    end_time: ''
  })

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [conflictingReservations, setConflictingReservations] = useState<ConflictingReservation[]>([])
  const [pendingClosureData, setPendingClosureData] = useState<any>(null)

  // Fetch closures with cache busting
  const fetchClosures = async () => {
    setLoading(true)
    try {
      console.log('🔄 HolidayManager: Fetching closures...')
      
      // Force cache refresh
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/closures?t=${timestamp}&r=${Math.random()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        const closuresData = data.closures || []
        setClosures(closuresData)
        console.log(`✅ HolidayManager: Loaded ${closuresData.length} closures`)
      } else {
        console.error('❌ Failed to fetch closures:', response.status)
        toast.error('Failed to load closures')
      }
    } catch (error) {
      console.error('❌ Error fetching closures:', error)
      toast.error('Failed to load closures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClosures()
  }, [])

  // Create closure with conflict detection
  const createClosure = async (closureData: any, forceCancel: boolean = false) => {
    try {
      console.log('➕ Creating new closure:', closureData)
      
      const response = await fetch('/api/admin/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        },
        body: JSON.stringify({
          ...closureData,
          force_cancel_reservations: forceCancel
        })
      })

      const result = await response.json()

      if (response.status === 409 && result.requires_confirmation) {
        // Conflict detected - show confirmation modal
        console.log('⚠️ Reservation conflicts detected:', result.conflicting_reservations.length)
        setConflictingReservations(result.conflicting_reservations)
        setPendingClosureData(closureData)
        setShowConfirmModal(true)
        return
      }

      if (response.ok) {
        console.log('✅ Closure created successfully:', result)
        
        // Show success message with cancellation info if applicable
        if (result.cancelled_reservations && result.cancelled_reservations.length > 0) {
          toast.success(
            `Closure created successfully. ${result.cancelled_reservations.length} reservation${result.cancelled_reservations.length !== 1 ? 's' : ''} cancelled and customer${result.cancelled_reservations.length !== 1 ? 's' : ''} notified.`,
            { duration: 5000 }
          )
        } else {
          toast.success('Closure added successfully')
        }
        
        // Refresh local data
        await fetchClosures()
        
        // Broadcast the event to other components
        broadcastClosureEvent('created', result.closure)
        
        // Reset form
        setShowAddForm(false)
        resetForm()
        
        // Call the callback if provided
        if (onClosureUpdate) {
          console.log('📞 Calling onClosureUpdate callback')
          onClosureUpdate()
        }
      } else {
        console.error('❌ Failed to create closure:', result)
        toast.error(result.message || 'Failed to add closure')
      }
    } catch (error) {
      console.error('❌ Error adding closure:', error)
      toast.error('Error adding closure')
    }
  }

  // Add new closure
  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.closure_date || !formData.closure_name) {
      toast.error('Date and name are required')
      return
    }

    // Prepare data for submission
    const submitData = {
      closure_date: formData.closure_date,
      closure_name: formData.closure_name,
      closure_reason: formData.closure_reason || undefined,
      all_day: formData.all_day,
      ...(formData.all_day ? {} : {
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined
      })
    }

    // Validate partial day closures
    if (!formData.all_day && (!formData.start_time || !formData.end_time)) {
      toast.error('Start and end times are required for partial day closures')
      return
    }

    await createClosure(submitData, false)
  }

  // Handle confirmation modal
  const handleConfirmCreation = async () => {
    if (pendingClosureData) {
      setShowConfirmModal(false)
      await createClosure(pendingClosureData, true) // Force cancel reservations
      setPendingClosureData(null)
      setConflictingReservations([])
    }
  }

  const handleCancelCreation = () => {
    setShowConfirmModal(false)
    setPendingClosureData(null)
    setConflictingReservations([])
    toast('Closure creation cancelled')
  }

  const resetForm = () => {
    setFormData({
      closure_date: '',
      closure_name: '',
      closure_reason: '',
      all_day: true,
      start_time: '',
      end_time: ''
    })
  }

  // Delete closure
  const handleDeleteClosure = async (id: string) => {
    const closureToDelete = closures.find(c => c.id === id)
    
    if (!confirm(`Are you sure you want to delete the closure "${closureToDelete?.closure_name}"?`)) {
      return
    }

    try {
      console.log('🗑️ Deleting closure:', id)
      
      const response = await fetch(`/api/admin/closures/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        }
      })

      if (response.ok) {
        console.log('✅ Closure deleted successfully')
        
        // Refresh local data
        await fetchClosures()
        
        // Broadcast the event to other components
        broadcastClosureEvent('deleted', { id, ...closureToDelete })
        
        toast.success('Closure deleted successfully')
        
        // Call the callback if provided
        if (onClosureUpdate) {
          console.log('📞 Calling onClosureUpdate callback after deletion')
          onClosureUpdate()
        }
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to delete closure:', errorData)
        toast.error(errorData.message || 'Failed to delete closure')
      }
    } catch (error) {
      console.error('❌ Error deleting closure:', error)
      toast.error('Error deleting closure')
    }
  }

  // Sort closures by date
  const sortedClosures = [...closures].sort((a, b) => 
    new Date(a.closure_date).getTime() - new Date(b.closure_date).getTime()
  )

  // Filter upcoming and past closures
  const today = new Date().toISOString().split('T')[0]
  const upcomingClosures = sortedClosures.filter(c => c.closure_date >= today)
  const pastClosures = sortedClosures.filter(c => c.closure_date < today)

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelCreation}
        onConfirm={handleConfirmCreation}
        conflictingReservations={conflictingReservations}
        closureDetails={pendingClosureData || {}}
      />

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Holiday & Closure Management</h2>
              <p className="text-sm text-gray-600">Block out days when the restaurant is closed</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Closure
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleAddClosure} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.closure_date}
                  onChange={(e) => setFormData({...formData, closure_date: e.target.value})}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.closure_name}
                  onChange={(e) => setFormData({...formData, closure_name: e.target.value})}
                  placeholder="e.g., Christmas Day"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={formData.closure_reason}
                onChange={(e) => setFormData({...formData, closure_reason: e.target.value})}
                placeholder="e.g., Statutory Holiday, Staff Training"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({...formData, all_day: e.target.checked})}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-700">All day closure</span>
              </label>
            </div>

            {!formData.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Warning message for potential conflicts */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> If there are existing reservations on this date/time, 
                  you will be asked to confirm their cancellation before the closure is created.
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Add Closure
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-6 text-center">
          <div className="text-gray-600">Loading closures...</div>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && !loading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200">
          <div className="text-sm text-yellow-800">
            <strong>🐛 Debug:</strong> HolidayManager has {closures.length} closures loaded
            {closures.length > 0 && (
              <div className="mt-1">
                IDs: {closures.map(c => c.id.substring(0, 8)).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Closures */}
      {!loading && upcomingClosures.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
            Upcoming Closures ({upcomingClosures.length})
          </h3>
          <div className="space-y-3">
            {upcomingClosures.map((closure) => (
              <div key={closure.id} className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{closure.closure_name}</div>
                  <div className="text-sm text-gray-600">
                    {format(parseISO(closure.closure_date), 'EEEE, MMMM do, yyyy')}
                    {!closure.all_day && closure.start_time && closure.end_time && (
                      <span className="ml-2">
                        ({format(parseISO(`2000-01-01T${closure.start_time}`), 'h:mm a')} - {format(parseISO(`2000-01-01T${closure.end_time}`), 'h:mm a')})
                      </span>
                    )}
                  </div>
                  {closure.closure_reason && (
                    <div className="text-sm text-gray-500">{closure.closure_reason}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    ID: {closure.id.substring(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClosure(closure.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete closure"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Closures */}
      {!loading && pastClosures.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Closures</h3>
          <div className="space-y-2">
            {pastClosures.slice(0, 5).map((closure) => (
              <div key={closure.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-700">{closure.closure_name}</div>
                  <div className="text-sm text-gray-500">
                    {format(parseISO(closure.closure_date), 'MMM do, yyyy')}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClosure(closure.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete closure"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {pastClosures.length > 5 && (
              <div className="text-sm text-gray-500 text-center">
                And {pastClosures.length - 5} more past closures...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && closures.length === 0 && (
        <div className="p-6 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No closures scheduled</h3>
          <p className="text-gray-500 mb-4">Add holidays or closure days to block reservations</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Add First Closure
          </button>
        </div>
      )}
    </div>
  )
}