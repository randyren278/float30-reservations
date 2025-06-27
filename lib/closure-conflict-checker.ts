// lib/closure-conflict-checker.ts
import { supabaseAdmin } from '@/lib/supabase'
import { emailService } from '@/lib/email'

interface RestaurantClosure {
  id: string
  closure_date: string
  closure_name: string
  closure_reason?: string
  all_day: boolean
  start_time?: string
  end_time?: string
}

interface ConflictingReservation {
  id: string
  name: string
  email: string
  phone?: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string
  status: string
  created_at: string
}

// Check for existing reservations that conflict with a closure
export async function checkClosureConflicts(closure: RestaurantClosure): Promise<ConflictingReservation[]> {
  try {
    console.log(`🔍 Checking closure conflicts for: ${closure.closure_name} on ${closure.closure_date}`)
    
    // Base query for reservations on the closure date
    let query = supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('reservation_date', closure.closure_date)
      .in('status', ['confirmed']) // Only check confirmed reservations
    
    // If it's a partial closure, filter by time
    if (!closure.all_day && closure.start_time && closure.end_time) {
      query = query
        .gte('reservation_time', closure.start_time)
        .lte('reservation_time', closure.end_time)
    }
    
    const { data: conflictingReservations, error } = await query
    
    if (error) {
      console.error('❌ Error checking closure conflicts:', error)
      throw error
    }
    
    console.log(`📊 Found ${conflictingReservations?.length || 0} conflicting reservations`)
    return conflictingReservations || []
    
  } catch (error) {
    console.error('❌ Error in checkClosureConflicts:', error)
    throw error
  }
}

// Cancel reservations that conflict with a closure
export async function cancelConflictingReservations(
  reservations: ConflictingReservation[], 
  closure: RestaurantClosure
): Promise<{ cancelled: any[], failed: any[] }> {
  console.log(`🚫 Cancelling ${reservations.length} reservations for closure: ${closure.closure_name}`)
  
  const cancelled = []
  const failed = []
  
  for (const reservation of reservations) {
    try {
      // Update reservation status to cancelled
      const { data: updatedReservation, error } = await supabaseAdmin
        .from('reservations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservation.id)
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Failed to cancel reservation ${reservation.id}:`, error)
        failed.push({ reservation, error: error.message })
        continue
      }
      
      cancelled.push(updatedReservation)
      
      // Send closure-specific cancellation email
      try {
        await emailService.sendCancellationEmail(updatedReservation, {
          name: closure.closure_name,
          reason: closure.closure_reason
        })
        console.log(`✅ Closure cancellation email sent for reservation ${reservation.id}`)
      } catch (emailError) {
        console.error(`❌ Failed to send closure cancellation email for reservation ${reservation.id}:`, emailError)
        // Don't fail the cancellation if email fails, but log it
      }
      
    } catch (error) {
      console.error(`❌ Error processing cancellation for reservation ${reservation.id}:`, error)
      failed.push({ reservation, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
  
  console.log(`✅ Cancelled ${cancelled.length} reservations, ${failed.length} failed`)
  return { cancelled, failed }
}

// Background service to automatically handle closure conflicts
export async function processClosureConflicts(closure: RestaurantClosure, forceCancel: boolean = false): Promise<{
  conflicts: ConflictingReservation[]
  cancelled: any[]
  failed: any[]
  requiresConfirmation: boolean
}> {
  try {
    // Check for conflicts
    const conflicts = await checkClosureConflicts(closure)
    
    if (conflicts.length === 0) {
      console.log(`✅ No conflicts found for closure: ${closure.closure_name}`)
      return {
        conflicts: [],
        cancelled: [],
        failed: [],
        requiresConfirmation: false
      }
    }
    
    // If not forcing cancellation, return conflicts for confirmation
    if (!forceCancel) {
      console.log(`⚠️ Found ${conflicts.length} conflicts, requiring confirmation`)
      return {
        conflicts,
        cancelled: [],
        failed: [],
        requiresConfirmation: true
      }
    }
    
    // Force cancel conflicting reservations
    const { cancelled, failed } = await cancelConflictingReservations(conflicts, closure)
    
    return {
      conflicts,
      cancelled,
      failed,
      requiresConfirmation: false
    }
    
  } catch (error) {
    console.error('❌ Error in processClosureConflicts:', error)
    throw error
  }
}

// Utility function to get a summary of conflicts
export function getConflictSummary(conflicts: ConflictingReservation[]): {
  totalReservations: number
  totalGuests: number
  timeRange: { earliest: string, latest: string } | null
  hasSpecialRequests: boolean
} {
  if (conflicts.length === 0) {
    return {
      totalReservations: 0,
      totalGuests: 0,
      timeRange: null,
      hasSpecialRequests: false
    }
  }
  
  const totalGuests = conflicts.reduce((sum, r) => sum + r.party_size, 0)
  const times = conflicts.map(r => r.reservation_time).sort()
  const hasSpecialRequests = conflicts.some(r => r.special_requests)
  
  return {
    totalReservations: conflicts.length,
    totalGuests,
    timeRange: {
      earliest: times[0],
      latest: times[times.length - 1]
    },
    hasSpecialRequests
  }
}

// Check if a specific date/time conflicts with any existing closures
export async function checkReservationAgainstClosures(reservationDate: string, reservationTime: string): Promise<{
  hasConflict: boolean
  conflictingClosure?: RestaurantClosure
}> {
  try {
    const { data: closures, error } = await supabaseAdmin
      .from('restaurant_closures')
      .select('*')
      .eq('closure_date', reservationDate)
    
    if (error) {
      console.error('Error checking closures:', error)
      return { hasConflict: false }
    }
    
    if (!closures || closures.length === 0) {
      return { hasConflict: false }
    }
    
    // Check each closure
    for (const closure of closures) {
      // All-day closure blocks everything
      if (closure.all_day) {
        return {
          hasConflict: true,
          conflictingClosure: closure
        }
      }
      
      // Partial closure - check time range
      if (closure.start_time && closure.end_time) {
        if (reservationTime >= closure.start_time && reservationTime <= closure.end_time) {
          return {
            hasConflict: true,
            conflictingClosure: closure
          }
        }
      }
    }
    
    return { hasConflict: false }
    
  } catch (error) {
    console.error('Error in checkReservationAgainstClosures:', error)
    return { hasConflict: false }
  }
}

// Utility function to format conflict details for display
export function formatConflictDetails(conflicts: ConflictingReservation[]): string {
  if (conflicts.length === 0) return 'No conflicts found'
  
  const summary = getConflictSummary(conflicts)
  let details = `${summary.totalReservations} reservation${summary.totalReservations !== 1 ? 's' : ''}`
  details += ` (${summary.totalGuests} guest${summary.totalGuests !== 1 ? 's' : ''})`
  
  if (summary.timeRange) {
    details += ` from ${summary.timeRange.earliest} to ${summary.timeRange.latest}`
  }
  
  if (summary.hasSpecialRequests) {
    details += ' (includes special requests)'
  }
  
  return details
}

// Batch process multiple closures
export async function batchProcessClosureConflicts(
  closures: RestaurantClosure[], 
  forceCancel: boolean = false
): Promise<{
  totalConflicts: number
  totalCancelled: number
  totalFailed: number
  results: any[]
}> {
  console.log(`🔄 Batch processing ${closures.length} closures for conflicts`)
  
  let totalConflicts = 0
  let totalCancelled = 0
  let totalFailed = 0
  const results = []
  
  for (const closure of closures) {
    try {
      const result = await processClosureConflicts(closure, forceCancel)
      
      totalConflicts += result.conflicts.length
      totalCancelled += result.cancelled.length
      totalFailed += result.failed.length
      
      results.push({
        closure,
        ...result
      })
      
    } catch (error) {
      console.error(`❌ Error processing closure ${closure.closure_name}:`, error)
      results.push({
        closure,
        error: error instanceof Error ? error.message : 'Unknown error',
        conflicts: [],
        cancelled: [],
        failed: [],
        requiresConfirmation: false
      })
    }
  }
  
  console.log(`✅ Batch processing complete: ${totalConflicts} conflicts, ${totalCancelled} cancelled, ${totalFailed} failed`)
  
  return {
    totalConflicts,
    totalCancelled,
    totalFailed,
    results
  }
}

// Validate closure data before processing
export function validateClosureData(closure: Partial<RestaurantClosure>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!closure.closure_date) {
    errors.push('Closure date is required')
  }
  
  if (!closure.closure_name || closure.closure_name.trim() === '') {
    errors.push('Closure name is required')
  }
  
  if (!closure.all_day) {
    if (!closure.start_time) {
      errors.push('Start time is required for partial closures')
    }
    if (!closure.end_time) {
      errors.push('End time is required for partial closures')
    }
    if (closure.start_time && closure.end_time && closure.start_time >= closure.end_time) {
      errors.push('Start time must be before end time')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get closure statistics
export async function getClosureStatistics(dateFrom?: string, dateTo?: string): Promise<{
  totalClosures: number
  allDayClosures: number
  partialClosures: number
  affectedReservations: number
  mostCommonReason: string | null
}> {
  try {
    let query = supabaseAdmin
      .from('restaurant_closures')
      .select('*')
    
    if (dateFrom) {
      query = query.gte('closure_date', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('closure_date', dateTo)
    }
    
    const { data: closures, error } = await query
    
    if (error) throw error
    
    if (!closures || closures.length === 0) {
      return {
        totalClosures: 0,
        allDayClosures: 0,
        partialClosures: 0,
        affectedReservations: 0,
        mostCommonReason: null
      }
    }
    
    const allDayClosures = closures.filter(c => c.all_day).length
    const partialClosures = closures.filter(c => !c.all_day).length
    
    // Count affected reservations (would need to check each closure)
    let affectedReservations = 0
    for (const closure of closures) {
      const conflicts = await checkClosureConflicts(closure)
      affectedReservations += conflicts.length
    }
    
    // Find most common reason
    const reasons = closures
      .map(c => c.closure_reason)
      .filter(r => r && r.trim() !== '')
    
    const reasonCounts = reasons.reduce((acc, reason) => {
      acc[reason!] = (acc[reason!] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostCommonReason = Object.keys(reasonCounts).length > 0
      ? Object.keys(reasonCounts).reduce((a, b) => reasonCounts[a] > reasonCounts[b] ? a : b)
      : null
    
    return {
      totalClosures: closures.length,
      allDayClosures,
      partialClosures,
      affectedReservations,
      mostCommonReason
    }
    
  } catch (error) {
    console.error('Error getting closure statistics:', error)
    return {
      totalClosures: 0,
      allDayClosures: 0,
      partialClosures: 0,
      affectedReservations: 0,
      mostCommonReason: null
    }
  }
}