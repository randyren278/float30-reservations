'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { Calendar, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react'
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

interface HolidayManagerProps {
  onClosureUpdate?: () => void
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

  // Fetch closures
  const fetchClosures = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/closures', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setClosures(data.closures || [])
      }
    } catch (error) {
      console.error('Error fetching closures:', error)
      toast.error('Failed to load closures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClosures()
  }, [])

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

    try {
      const response = await fetch('/api/admin/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        await fetchClosures()
        setShowAddForm(false)
        setFormData({
          closure_date: '',
          closure_name: '',
          closure_reason: '',
          all_day: true,
          start_time: '',
          end_time: ''
        })
        toast.success('Closure added successfully')
        if (onClosureUpdate) onClosureUpdate()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add closure')
      }
    } catch (error) {
      toast.error('Error adding closure')
    }
  }

  // Delete closure
  const handleDeleteClosure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this closure?')) return

    try {
      const response = await fetch(`/api/admin/closures/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        }
      })

      if (response.ok) {
        await fetchClosures()
        toast.success('Closure deleted successfully')
        if (onClosureUpdate) onClosureUpdate()
      } else {
        toast.error('Failed to delete closure')
      }
    } catch (error) {
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

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Add Closure
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
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

      {/* Upcoming Closures */}
      {!loading && upcomingClosures.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
            Upcoming Closures
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