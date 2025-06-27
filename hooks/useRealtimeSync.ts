// hooks/useRealtimeSync.ts - Debug Version
import { useState, useEffect, useCallback, useRef } from 'react'

interface TableConfiguration {
  id?: string
  party_size: number
  table_count: number
  max_reservations_per_slot: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface GlobalSettings {
  max_party_size: number
  slot_duration: number
  advance_booking_days: number
}

interface Closure {
  id: string
  closure_date: string
  closure_name: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

interface SyncData {
  tableConfigs: TableConfiguration[]
  globalSettings: GlobalSettings
  closures: Closure[]
  timestamp: number
}

interface UseSyncOptions {
  enablePolling?: boolean
  pollingInterval?: number
  enableEventListeners?: boolean
  fetchOnMount?: boolean
}

// Simplified version for debugging
export function useTableConfigs(options: UseSyncOptions = {}) {
  const {
    enablePolling = true,
    pollingInterval = 5000, // Slower for debugging
    enableEventListeners = true,
    fetchOnMount = true
  } = options

  const [tableConfigs, setTableConfigs] = useState<TableConfiguration[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    max_party_size: 10,
    slot_duration: 30,
    advance_booking_days: 30
  })
  const [loading, setLoading] = useState(true) // Start as true
  const [error, setError] = useState<string | null>(null)
  
  const lastFetchRef = useRef<number>(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const isUnmountedRef = useRef(false)

  // Force refresh function with better error handling
  const forceRefresh = useCallback(async () => {
    if (isUnmountedRef.current) return
    
    const now = Date.now()
    // Prevent duplicate fetches within 2 seconds
    if (now - lastFetchRef.current < 2000) {
      console.log('🚫 Skipping fetch due to rate limiting')
      return
    }
    
    lastFetchRef.current = now
    console.log('🔄 useTableConfigs: Starting data fetch...')
    
    try {
      // Try table configs first
      console.log('📊 Fetching table configurations...')
      const configResponse = await fetch('/api/table-config', {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Debug': 'true'
        }
      })
      
      console.log('📊 Table config response status:', configResponse.status)
      
      if (configResponse.ok) {
        const configData = await configResponse.json()
        console.log('📊 Table config data received:', {
          configs: configData.table_configs?.length || 0,
          settings: configData.global_settings
        })
        
        const activeConfigs = configData.table_configs?.filter((c: any) => c.is_active) || []
        setTableConfigs(activeConfigs)
        setGlobalSettings(configData.global_settings || globalSettings)
        setError(null)
        
        console.log('✅ useTableConfigs: Successfully updated data')
      } else {
        const errorText = await configResponse.text()
        console.error('❌ Table config fetch failed:', configResponse.status, errorText)
        setError(`API Error: ${configResponse.status}`)
      }
      
    } catch (err) {
      console.error('❌ useTableConfigs: Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false)
        console.log('🏁 useTableConfigs: Fetch completed, loading set to false')
      }
    }
  }, [globalSettings])

  // Initial fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      console.log('🚀 useTableConfigs: Initial fetch on mount')
      forceRefresh()
    }
    
    return () => {
      isUnmountedRef.current = true
    }
  }, [fetchOnMount, forceRefresh])

  // Set up polling
  useEffect(() => {
    if (!enablePolling) {
      console.log('⏸️ Polling disabled')
      return
    }
    
    console.log(`⏰ Setting up polling every ${pollingInterval}ms`)
    
    pollingIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current) {
        console.log('⏰ Polling tick - refreshing data')
        forceRefresh()
      }
    }, pollingInterval)
    
    return () => {
      if (pollingIntervalRef.current) {
        console.log('🧹 Cleaning up polling interval')
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [enablePolling, pollingInterval, forceRefresh])

  // Manual refresh function
  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered')
    setLoading(true)
    return forceRefresh()
  }, [forceRefresh])

  // Computed values
  const availablePartySizes = tableConfigs.map(c => c.party_size).sort((a, b) => a - b)
  
  return {
    tableConfigs,
    globalSettings,
    loading,
    error,
    refresh,
    // Convenience getters
    availablePartySizes,
    maxPartySize: globalSettings.max_party_size,
    slotDuration: globalSettings.slot_duration,
    advanceBookingDays: globalSettings.advance_booking_days
  }
}

export function useClosures(options: UseSyncOptions = {}) {
  const {
    enablePolling = true,
    pollingInterval = 10000, // Even slower for closures
    enableEventListeners = true,
    fetchOnMount = true
  } = options

  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const lastFetchRef = useRef<number>(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const isUnmountedRef = useRef(false)

  const forceRefresh = useCallback(async () => {
    if (isUnmountedRef.current) return
    
    const now = Date.now()
    if (now - lastFetchRef.current < 2000) {
      console.log('🚫 Skipping closures fetch due to rate limiting')
      return
    }
    
    lastFetchRef.current = now
    console.log('🔄 useClosures: Starting closures fetch...')
    
    try {
      const response = await fetch('/api/closures', {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Debug': 'true'
        }
      })
      
      console.log('📅 Closures response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📅 Closures data received:', {
          count: data.closures?.length || 0
        })
        
        setClosures(data.closures || [])
        setError(null)
        
        console.log('✅ useClosures: Successfully updated closures')
      } else {
        const errorText = await response.text()
        console.error('❌ Closures fetch failed:', response.status, errorText)
        setError(`Closures API Error: ${response.status}`)
      }
      
    } catch (err) {
      console.error('❌ useClosures: Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false)
        console.log('🏁 useClosures: Fetch completed, loading set to false')
      }
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (fetchOnMount) {
      console.log('🚀 useClosures: Initial fetch on mount')
      forceRefresh()
    }
    
    return () => {
      isUnmountedRef.current = true
    }
  }, [fetchOnMount, forceRefresh])

  // Set up polling
  useEffect(() => {
    if (!enablePolling) return
    
    console.log(`⏰ Setting up closures polling every ${pollingInterval}ms`)
    
    pollingIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current) {
        console.log('⏰ Closures polling tick')
        forceRefresh()
      }
    }, pollingInterval)
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [enablePolling, pollingInterval, forceRefresh])

  const refresh = useCallback(() => {
    console.log('🔄 Manual closures refresh triggered')
    setLoading(true)
    return forceRefresh()
  }, [forceRefresh])

  const today = new Date().toISOString().split('T')[0]
  
  return {
    closures,
    loading,
    error,
    refresh,
    upcomingClosures: closures.filter(c => c.closure_date >= today),
    pastClosures: closures.filter(c => c.closure_date < today)
  }
}

export function useGlobalSettings(options: UseSyncOptions = {}) {
  const { globalSettings, loading, error, refresh } = useTableConfigs(options)
  
  return {
    settings: globalSettings,
    loading,
    error,
    refresh,
    maxPartySize: globalSettings.max_party_size,
    slotDuration: globalSettings.slot_duration,
    advanceBookingDays: globalSettings.advance_booking_days
  }
}

// Simplified triggers for now
export function useSyncTriggers() {
  const triggerTableConfigUpdate = useCallback((data?: any) => {
    console.log('📡 Broadcasting table config update:', data)
    window.dispatchEvent(new CustomEvent('tableConfigUpdated', {
      detail: { ...data, timestamp: Date.now() }
    }))
  }, [])
  
  const triggerClosureUpdate = useCallback((data?: any) => {
    console.log('📡 Broadcasting closure update:', data)
    window.dispatchEvent(new CustomEvent('closureUpdated', {
      detail: { ...data, timestamp: Date.now() }
    }))
  }, [])
  
  const triggerGlobalRefresh = useCallback(() => {
    console.log('📡 Broadcasting global refresh')
    window.dispatchEvent(new CustomEvent('globalRefresh', {
      detail: { timestamp: Date.now() }
    }))
  }, [])
  
  return {
    triggerTableConfigUpdate,
    triggerClosureUpdate,
    triggerGlobalRefresh
  }
}