'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isToday, isFuture } from 'date-fns'
import { Calendar, Clock, Users, Mail, Phone, CheckCircle, XCircle, AlertCircle, Download, Grid, List, Settings, RefreshCw, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminCalendar from '@/components/AdminCalender'
import ReservationModal from '@/components/ReservationModal'
import HolidayManager from '@/components/HolidayManager'
import TableManager from '@/components/TableManager'
import AddReservation from '@/components/AddReservations'

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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'closures' | 'tables' | 'add-reservation'>('calendar')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_authenticated') === 'true'
    setIsAuthenticated(isAuth)
    if (isAuth) {
      fetchReservations()
    }
  }, [])

  // Global refresh function that all components can use
  const triggerGlobalRefresh = useCallback(async () => {
    console.log('🔄 Admin Dashboard: Triggering global refresh')
    setRefreshing(true)
    
    try {
      // Refresh reservations
      await fetchReservations()
      
      // Broadcast refresh event to all child components
      console.log('📡 Broadcasting global refresh event')
      window.dispatchEvent(new CustomEvent('globalRefresh', {
        detail: { timestamp: new Date().toISOString() }
      }))
      
      // Also broadcast table config update to ensure reservation form refreshes
      window.dispatchEvent(new CustomEvent('tableConfigUpdated', {
        detail: { 
          timestamp: new Date().toISOString(),
          source: 'admin_dashboard_refresh'
        }
      }))
      
      console.log('✅ Global refresh completed')
    } catch (error) {
      console.error('❌ Global refresh failed:', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (response.ok) {
        localStorage.setItem('admin_authenticated', 'true')
        localStorage.setItem('admin_password', password) // Store for API calls
        setIsAuthenticated(true)
        await fetchReservations()
        toast.success('Login successful')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Invalid password')
      }
    } catch (error) {
      toast.error('Login failed')
    } finally {
      setLoading(false)
      setPassword('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated')
    localStorage.removeItem('admin_password')
    setIsAuthenticated(false)
    setReservations([])
  }

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setSelectedReservation(null)
    setIsModalOpen(false)
  }

  const fetchReservations = async () => {
    setLoading(true)
    try {
      console.log('📋 Admin Dashboard: Fetching reservations')
      
      const response = await fetch('/api/admin/reservations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      })
      
      if (response.status === 401) {
        // Not authenticated, redirect to login
        setIsAuthenticated(false)
        localStorage.removeItem('admin_authenticated')
        localStorage.removeItem('admin_password')
        toast.error('Session expired. Please log in again.')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        const receivedReservations = data.reservations || []
        setReservations(receivedReservations)
        console.log(`✅ Admin Dashboard: Loaded ${receivedReservations.length} reservations`)
        
        if (receivedReservations.length === 0) {
          console.log('No reservations found in database')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to fetch reservations')
      }
    } catch (error) {
      console.error('❌ Admin Dashboard: Error loading reservations:', error)
      toast.error('Error loading reservations')
    } finally {
      setLoading(false)
    }
  }

  const updateReservationStatus = async (id: string, status: Reservation['status']) => {
    try {
      console.log('🔄 Admin Dashboard: Updating reservation status:', { id, status })
      
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        },
        body: JSON.stringify({ status })
      })

      console.log('Status update response:', response.status)

      if (response.ok) {
        await fetchReservations()
        toast.success(`Reservation ${status}`)
      } else {
        const errorData = await response.json()
        console.error('Status update failed:', errorData)
        toast.error(errorData.message || 'Failed to update reservation')
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Error updating reservation')
    }
  }

  // Handle closure updates from HolidayManager
  const handleClosureUpdate = useCallback(async () => {
    console.log('🎯 Admin Dashboard: Closure update received, triggering global refresh')
    await triggerGlobalRefresh()
  }, [triggerGlobalRefresh])

  // Handle table configuration updates
  const handleTableConfigUpdate = useCallback(async () => {
    console.log('🎯 Admin Dashboard: Table config update received, triggering global refresh')
    await triggerGlobalRefresh()
    
    // Additional notification for table config changes
    toast.success('Table configurations updated successfully!')
    
    // Broadcast specific table config update event
    window.dispatchEvent(new CustomEvent('tableConfigUpdated', {
      detail: { 
        timestamp: new Date().toISOString(),
        source: 'admin_dashboard_table_update'
      }
    }))
  }, [triggerGlobalRefresh])

  const exportReservations = () => {
    const filteredReservations = getFilteredReservations()
    const csv = [
      ['Date', 'Time', 'Name', 'Email', 'Phone', 'Party Size', 'Status', 'Special Requests', 'Created At'].join(','),
      ...filteredReservations.map(r => [
        r.reservation_date,
        r.reservation_time,
        `"${r.name}"`,
        r.email,
        r.phone || '',
        r.party_size,
        r.status,
        `"${r.special_requests || ''}"`,
        format(parseISO(r.created_at), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getFilteredReservations = () => {
    let filtered = reservations

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Apply date filter
    switch (filter) {
      case 'today':
        filtered = filtered.filter(r => isToday(parseISO(r.reservation_date)))
        break
      case 'upcoming':
        filtered = filtered.filter(r => isFuture(parseISO(`${r.reservation_date}T${r.reservation_time}`)))
        break
      case 'past':
        filtered = filtered.filter(r => !isFuture(parseISO(`${r.reservation_date}T${r.reservation_time}`)))
        break
    }

    return filtered.sort((a, b) => 
      new Date(`${b.reservation_date}T${b.reservation_time}`).getTime() - 
      new Date(`${a.reservation_date}T${a.reservation_time}`).getTime()
    )
  }

  const getStatusIcon = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'no_show': return <AlertCircle className="w-4 h-4 text-orange-500" />
    }
  }

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const filteredReservations = getFilteredReservations()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Reservation Dashboard</h1>
            <div className="flex items-center space-x-4">
              {/* Global Refresh Button */}
              <button
                onClick={triggerGlobalRefresh}
                disabled={refreshing}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Refresh all data"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh All'}
              </button>
              
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reservations</p>
                <p className="text-2xl font-semibold text-gray-900">{reservations.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.filter(r => r.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.filter(r => isToday(parseISO(r.reservation_date))).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Guests</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.reduce((sum, r) => sum + r.party_size, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-4 h-4 mr-2" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('add-reservation')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'add-reservation'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Reservation
                </button>
                <button
                  onClick={() => setViewMode('tables')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'tables'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Tables
                </button>
                <button
                  onClick={() => setViewMode('closures')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'closures'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Closures
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {viewMode === 'list' && (
                <>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Reservations</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                  </select>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No Show</option>
                  </select>
                </>
              )}
              
              {viewMode !== 'closures' && viewMode !== 'tables' && viewMode !== 'add-reservation' && (
                <div className="flex gap-2">
                  <button
                    onClick={fetchReservations}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                  
                  <button
                    onClick={exportReservations}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar, List, Closures, Tables, or Add Reservation View */}
        {viewMode === 'calendar' ? (
          <AdminCalendar
            onReservationClick={handleReservationClick}
            onStatusUpdate={updateReservationStatus}
          />
        ) : viewMode === 'closures' ? (
          <HolidayManager
            onClosureUpdate={handleClosureUpdate}
          />
        ) : viewMode === 'tables' ? (
          <TableManager
            onSettingsUpdate={handleTableConfigUpdate}
          />
        ) : viewMode === 'add-reservation' ? (
          <AddReservation
            onSuccess={(reservation) => {
              console.log('✅ Reservation created:', reservation)
              triggerGlobalRefresh()
              // Optionally switch back to calendar view
              setViewMode('calendar')
            }}
            onCancel={() => setViewMode('calendar')}
          />
        ) : (
          /* List View (existing table) */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {format(parseISO(reservation.reservation_date), 'MMM do, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{reservation.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {reservation.email}
                          </div>
                          {reservation.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {reservation.phone}
                            </div>
                          )}
                          {reservation.special_requests && (
                            <div className="text-xs text-orange-600 mt-1">
                              Special: {reservation.special_requests}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{reservation.party_size}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(reservation.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                            {reservation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReservationClick(reservation)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                          {reservation.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'completed')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'no_show')}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                No Show
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {reservation.status === 'cancelled' && (
                            <button
                              onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredReservations.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reservations found</h3>
                <p className="text-gray-500">No reservations match your current filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Reservation Details Modal */}
        <ReservationModal
          reservation={selectedReservation}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onStatusUpdate={updateReservationStatus}
        />
      </div>
    </div>
  )
}