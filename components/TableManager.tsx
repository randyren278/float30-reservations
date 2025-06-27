'use client'

import { useState, useEffect } from 'react'
import { Users, Settings, Save, RotateCcw, Plus, Minus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface TableConfiguration {
  id: string
  party_size: number
  table_count: number
  max_reservations_per_slot: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface GlobalSettings {
  max_party_size: number
  slot_duration: number
  advance_booking_days: number
}

interface TableManagerProps {
  onSettingsUpdate?: () => void
}

// Add Table Size Modal Component
interface AddTableSizeModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (partySize: number) => void
  existingPartySizes: number[]
  maxPartySize: number
}

function AddTableSizeModal({ isOpen, onClose, onAdd, existingPartySizes, maxPartySize }: AddTableSizeModalProps) {
  const [selectedPartySize, setSelectedPartySize] = useState<number>(1)

  if (!isOpen) return null

  // Generate available party sizes (not already configured)
  const availablePartySizes = Array.from({ length: maxPartySize }, (_, i) => i + 1)
    .filter(size => !existingPartySizes.includes(size))

  const handleAdd = () => {
    if (selectedPartySize && !existingPartySizes.includes(selectedPartySize)) {
      onAdd(selectedPartySize)
      onClose()
      setSelectedPartySize(1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Table Configuration</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {availablePartySizes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600">All party sizes up to {maxPartySize} people are already configured.</p>
              <p className="text-sm text-gray-500 mt-2">
                Increase the max party size in global settings to add more configurations.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Party Size
                </label>
                <select
                  value={selectedPartySize}
                  onChange={(e) => setSelectedPartySize(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availablePartySizes.map(size => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'person' : 'people'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will create a new table configuration for {selectedPartySize} {selectedPartySize === 1 ? 'person' : 'people'} with:
                </p>
                <ul className="text-sm text-blue-700 mt-1 ml-4">
                  <li>• 1 table initially (you can change this after)</li>
                  <li>• 1 max reservation per slot initially</li>
                  <li>• Active status (accepting reservations)</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            {availablePartySizes.length > 0 && (
              <button
                onClick={handleAdd}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Table Configuration
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              {availablePartySizes.length > 0 ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TableManager({ onSettingsUpdate }: TableManagerProps) {
  const [tableConfigs, setTableConfigs] = useState<TableConfiguration[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    max_party_size: 10,
    slot_duration: 30,
    advance_booking_days: 30
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch current table configurations
  const fetchTableConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/table-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTableConfigs(data.table_configs || [])
        setGlobalSettings(data.global_settings || globalSettings)
        console.log('✅ Table configurations loaded:', data.table_configs?.length || 0)
      } else {
        console.error('❌ Failed to fetch table configs:', response.status)
        toast.error('Failed to load table configurations')
      }
    } catch (error) {
      console.error('❌ Error fetching table configs:', error)
      toast.error('Error loading table configurations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTableConfigs()
  }, [])

  // Update table configuration
  const updateTableConfig = (partySize: number, field: keyof TableConfiguration, value: any) => {
    setTableConfigs(prev => prev.map(config => 
      config.party_size === partySize 
        ? { ...config, [field]: value }
        : config
    ))
  }

  // Add new table size via modal
  const handleAddTableSize = (partySize: number) => {
    const newConfig: TableConfiguration = {
      id: `temp-${Date.now()}`,
      party_size: partySize,
      table_count: 1,
      max_reservations_per_slot: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setTableConfigs(prev => [...prev, newConfig].sort((a, b) => a.party_size - b.party_size))
    toast.success(`Added table configuration for ${partySize} ${partySize === 1 ? 'person' : 'people'}`)
  }

  // Remove table size
  const removeTableSize = (partySize: number) => {
    if (tableConfigs.length <= 1) {
      toast.error('Must have at least one table configuration')
      return
    }
    
    if (confirm(`Remove table configuration for ${partySize} ${partySize === 1 ? 'person' : 'people'}? This will prevent customers from booking tables for this party size.`)) {
      setTableConfigs(prev => prev.filter(config => config.party_size !== partySize))
      toast.success(`Removed table configuration for ${partySize} ${partySize === 1 ? 'person' : 'people'}`)
    }
  }

  // Save all configurations
  const saveConfigurations = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/table-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_password') || ''}`
        },
        body: JSON.stringify({
          table_configs: tableConfigs,
          global_settings: globalSettings
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Table configurations saved successfully')
        toast.success('Table configurations saved successfully')
        
        // Refresh data to get server IDs
        await fetchTableConfigs()
        
        if (onSettingsUpdate) {
          onSettingsUpdate()
        }
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to save configurations:', errorData)
        toast.error(errorData.message || 'Failed to save configurations')
      }
    } catch (error) {
      console.error('❌ Error saving configurations:', error)
      toast.error('Error saving configurations')
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Reset all table configurations to defaults? This will lose all current settings.')) {
      const defaultConfigs: TableConfiguration[] = [
        { id: 'temp-1', party_size: 1, table_count: 2, max_reservations_per_slot: 2, is_active: true, created_at: '', updated_at: '' },
        { id: 'temp-2', party_size: 2, table_count: 6, max_reservations_per_slot: 3, is_active: true, created_at: '', updated_at: '' },
        { id: 'temp-3', party_size: 4, table_count: 4, max_reservations_per_slot: 2, is_active: true, created_at: '', updated_at: '' },
        { id: 'temp-4', party_size: 6, table_count: 2, max_reservations_per_slot: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 'temp-5', party_size: 8, table_count: 1, max_reservations_per_slot: 1, is_active: true, created_at: '', updated_at: '' }
      ]
      
      setTableConfigs(defaultConfigs)
      setGlobalSettings({
        max_party_size: 10,
        slot_duration: 30,
        advance_booking_days: 30
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-gray-600">Loading table configurations...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Add Table Size Modal */}
      <AddTableSizeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTableSize}
        existingPartySizes={tableConfigs.map(c => c.party_size)}
        maxPartySize={globalSettings.max_party_size}
      />

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Table Management</h2>
              <p className="text-sm text-gray-600">Configure table availability and reservation limits</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            
            <button
              onClick={saveConfigurations}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="p-6 border-b border-gray-200 bg-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Party Size
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={globalSettings.max_party_size}
              onChange={(e) => setGlobalSettings(prev => ({
                ...prev,
                max_party_size: parseInt(e.target.value) || 1
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum party size customers can book</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slot Duration (minutes)
            </label>
            <select
              value={globalSettings.slot_duration}
              onChange={(e) => setGlobalSettings(prev => ({
                ...prev,
                slot_duration: parseInt(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Advance Booking (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={globalSettings.advance_booking_days}
              onChange={(e) => setGlobalSettings(prev => ({
                ...prev,
                advance_booking_days: parseInt(e.target.value) || 1
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">How far in advance customers can book</p>
          </div>
        </div>
      </div>

      {/* Table Configurations */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Table Configurations by Party Size</h3>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Table Size
          </button>
        </div>

        <div className="space-y-4">
          {tableConfigs.sort((a, b) => a.party_size - b.party_size).map((config) => (
            <div key={`${config.party_size}-${config.id}`} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* Party Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Party Size
                  </label>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-lg font-semibold">
                      {config.party_size} {config.party_size === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                </div>

                {/* Table Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Tables
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.table_count}
                    onChange={(e) => updateTableConfig(config.party_size, 'table_count', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                  <p className="text-xs text-gray-500 mt-1">Physical tables available</p>
                </div>

                {/* Max Reservations per Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Reservations/Slot
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={config.table_count || undefined}
                    value={config.max_reservations_per_slot}
                    onChange={(e) => updateTableConfig(config.party_size, 'max_reservations_per_slot', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {config.table_count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended max: {config.table_count}
                    </p>
                  )}
                </div>

                {/* Active Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.is_active}
                      onChange={(e) => updateTableConfig(config.party_size, 'is_active', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {config.is_active ? 'Accepting reservations' : 'Not bookable'}
                  </p>
                </div>

                {/* Actions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actions
                  </label>
                  <button
                    onClick={() => removeTableSize(config.party_size)}
                    className="flex items-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  <strong>Configuration:</strong> 
                  {config.table_count > 0 ? (
                    <>
                      {config.table_count} table{config.table_count !== 1 ? 's' : ''} for {config.party_size} {config.party_size === 1 ? 'person' : 'people'}, 
                      up to {config.max_reservations_per_slot} reservation{config.max_reservations_per_slot !== 1 ? 's' : ''} per time slot
                    </>
                  ) : (
                    <>
                      Unlimited tables for {config.party_size} {config.party_size === 1 ? 'person' : 'people'}, 
                      up to {config.max_reservations_per_slot} reservation{config.max_reservations_per_slot !== 1 ? 's' : ''} per time slot
                    </>
                  )}
                  {!config.is_active && <span className="text-red-600 ml-2">(Not accepting bookings)</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {tableConfigs.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No table configurations</h3>
            <p className="text-gray-500 mb-4">Add table configurations to manage reservation capacity</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Configuration
            </button>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {tableConfigs.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h4 className="font-semibold text-gray-900 mb-3">Configuration Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {tableConfigs.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active Party Sizes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tableConfigs.reduce((sum, c) => c.is_active ? sum + c.table_count : sum, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Tables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {tableConfigs.reduce((sum, c) => c.is_active ? sum + c.max_reservations_per_slot : sum, 0)}
              </div>
              <div className="text-sm text-gray-600">Max Reservations/Slot</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...tableConfigs.filter(c => c.is_active).map(c => c.party_size), 0)}
              </div>
              <div className="text-sm text-gray-600">Largest Party Size</div>
            </div>
          </div>
          
          {/* Available Party Sizes */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <strong>Available for booking:</strong> 
              {tableConfigs.filter(c => c.is_active).length > 0 ? (
                <span className="ml-2">
                  {tableConfigs
                    .filter(c => c.is_active)
                    .sort((a, b) => a.party_size - b.party_size)
                    .map(c => `${c.party_size} ${c.party_size === 1 ? 'person' : 'people'}`)
                    .join(', ')}
                </span>
              ) : (
                <span className="text-red-600 ml-2">No party sizes available for booking</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}