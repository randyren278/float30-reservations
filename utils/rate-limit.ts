import { NextRequest } from 'next/server'

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Simple in-memory rate limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private limit: number
  private windowMs: number

  constructor(limit: number = 10, windowMs: number = 15 * 60 * 1000) { // 10 requests per 15 minutes
    this.limit = limit
    this.windowMs = windowMs
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || []
    
    // Filter out requests outside the current window
    const validRequests = requests.filter(timestamp => timestamp > windowStart)
    
    // Check if limit exceeded
    if (validRequests.length >= this.limit) {
      const oldestRequest = Math.min(...validRequests)
      const resetTime = oldestRequest + this.windowMs
      
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: resetTime
      }
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      this.cleanup()
    }
    
    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - validRequests.length,
      reset: now + this.windowMs
    }
  }

  private cleanup() {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart)
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier)
      } else {
        this.requests.set(identifier, validRequests)
      }
    }
  }
}

// Create rate limiter instances
const reservationLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_MAX || '10'),
  parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
)

const adminLimiter = new RateLimiter(20, 15 * 60 * 1000) // 20 requests per 15 minutes

// Helper function to get client identifier
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  let ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  // For development/testing, use a fallback
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    ip = 'dev-client'
  }
  
  return ip
}

// Rate limiting middleware for reservations
export async function rateLimitReservations(request: NextRequest): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request)
  return reservationLimiter.check(`reservation:${identifier}`)
}

// Rate limiting middleware for admin operations
export async function rateLimitAdmin(request: NextRequest): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request)
  return adminLimiter.check(`admin:${identifier}`)
}

// Rate limiting middleware for general API
export async function rateLimitGeneral(request: NextRequest): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request)
  return new RateLimiter(100, 15 * 60 * 1000).check(`general:${identifier}`)
}

// Helper to create rate limit response
export function createRateLimitResponse(result: RateLimitResult) {
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString()
  })

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers.entries())
      }
    }
  )
}

// Enhanced rate limiter with different strategies
export class AdvancedRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map()

  constructor(private config: Record<string, { limit: number; windowMs: number }>) {}

  check(strategy: string, identifier: string): RateLimitResult {
    if (!this.limiters.has(strategy)) {
      const config = this.config[strategy] || { limit: 10, windowMs: 15 * 60 * 1000 }
      this.limiters.set(strategy, new RateLimiter(config.limit, config.windowMs))
    }

    const limiter = this.limiters.get(strategy)!
    return limiter.check(identifier)
  }
}

// Pre-configured rate limiter
export const apiRateLimiter = new AdvancedRateLimiter({
  'reservation-create': { limit: 5, windowMs: 15 * 60 * 1000 },  // 5 reservations per 15 minutes
  'reservation-check': { limit: 30, windowMs: 15 * 60 * 1000 },  // 30 availability checks per 15 minutes
  'admin-login': { limit: 5, windowMs: 15 * 60 * 1000 },         // 5 login attempts per 15 minutes
  'admin-operations': { limit: 100, windowMs: 15 * 60 * 1000 },  // 100 admin operations per 15 minutes
  'general': { limit: 60, windowMs: 15 * 60 * 1000 }             // 60 general requests per 15 minutes
})