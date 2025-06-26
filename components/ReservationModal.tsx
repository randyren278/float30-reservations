'use client'

import { format, parseISO } from 'date-fns'
import { X, Calendar, Clock, Users, Mail, Phone, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

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

interface ReservationModalProps {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (id: string, status: Reservation['status']) => void
}

export default function ReservationModal({ reservation, isOpen, onClose, onStatusUpdate }: ReservationModalProps) {
  if (!isOpen || !reservation) return null

  const getStatusIcon = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />
      case 'completed': return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'no_show': return <AlertCircle className="w-5 h-5 text-orange-500" />
    }
  }

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200'
    }
  }

  const handleStatusUpdate = (newStatus: Reservation['status']) => {
    console.log('Modal status update:', { reservationId: reservation.id, newStatus })
    onStatusUpdate(reservation.id, newStatus)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Reservation Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(reservation.status)}`}>
              {getStatusIcon(reservation.status)}
              <span className="ml-2 capitalize">{reservation.status}</span>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Customer Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-4 h-4 mr-3 text-gray-400">👤</div>
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="font-medium">{reservation.name}</div>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium">
                    <a 
                      href={`mailto:${reservation.email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {reservation.email}
                    </a>
                  </div>
                </div>
              </div>

              {reservation.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">
                      <a 
                        href={`tel:${reservation.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {reservation.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Reservation Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="font-medium">
                    {format(parseISO(reservation.reservation_date), 'EEEE, MMMM do, yyyy')}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Time</div>
                  <div className="font-medium">
                    {format(parseISO(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <Users className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Party Size</div>
                  <div className="font-medium">
                    {reservation.party_size} {reservation.party_size === 1 ? 'person' : 'people'}
                  </div>
                </div>
              </div>

              {reservation.special_requests && (
                <div className="flex items-start">
                  <MessageSquare className="w-4 h-4 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Special Requests</div>
                    <div className="font-medium text-orange-700 bg-orange-50 p-2 rounded-md">
                      {reservation.special_requests}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Booking Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-4 h-4 mr-3 text-gray-400">📝</div>
                <div>
                  <div className="text-sm text-gray-600">Confirmation ID</div>
                  <div className="font-medium font-mono text-sm">
                    {reservation.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-4 h-4 mr-3 text-gray-400">⏰</div>
                <div>
                  <div className="text-sm text-gray-600">Booked At</div>
                  <div className="font-medium">
                    {format(parseISO(reservation.created_at), 'MMM do, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {reservation.status !== 'cancelled' && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {reservation.status !== 'confirmed' && (
                  <button
                    onClick={() => handleStatusUpdate('confirmed')}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Mark Confirmed
                  </button>
                )}
                {reservation.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Mark Completed
                  </button>
                )}
                {reservation.status !== 'no_show' && (
                  <button
                    onClick={() => handleStatusUpdate('no_show')}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Mark No Show
                  </button>
                )}
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}