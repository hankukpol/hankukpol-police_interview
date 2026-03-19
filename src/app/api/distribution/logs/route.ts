import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10) || 50))
  const offset = (page - 1) * limit
  const q = sp.get('q')?.trim() ?? ''

  const db = createServerClient()

  let studentIds: string[] | null = null
  if (q) {
    const escaped = q.replace(/[%_\\]/g, '\\$&')
    const { data: matched } = await db
      .from('students')
      .select('id')
      .or(`name.ilike.%${escaped}%,exam_number.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
    studentIds = (matched ?? []).map(s => s.id)
    if (studentIds.length === 0) {
      return NextResponse.json({ logs: [], total: 0 })
    }
  }

  let query = db
    .from('distribution_logs')
    .select(
      'id, distributed_at, distributed_by, note, students(name, exam_number, series, region), materials(name)',
      { count: 'exact' }
    )
    .order('distributed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (studentIds) {
    query = query.in('student_id', studentIds)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
