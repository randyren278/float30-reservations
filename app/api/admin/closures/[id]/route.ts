import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('admin_session')
  if (authCookie?.value === 'true') return true
  
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) return true
  
  return false
}

// DELETE /api/admin/closures/[id] - Delete closure
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid closure ID format' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('restaurant_closures')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Closure deleted successfully'
    })

  } catch (error) {
    console.error('Delete closure error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to delete closure.'
      },
      { status: 500 }
    )
  }
}