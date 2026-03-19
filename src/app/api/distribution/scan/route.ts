import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyQrToken } from '@/lib/qr/token'
import { createServerClient } from '@/lib/supabase/server'
import { verifyJwt, STAFF_COOKIE, ADMIN_COOKIE } from '@/lib/auth/jwt'
import { distributeMaterial } from '@/lib/distribution/materials'

const schema = z.object({
  token: z.string().min(1),
  material_id: z.number().int().positive().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, reason: 'INVALID_INPUT' }, { status: 400 })
  }

  const staffCookie = req.cookies.get(STAFF_COOKIE)?.value
  const adminCookie = req.cookies.get(ADMIN_COOKIE)?.value
  const payload = staffCookie
    ? await verifyJwt(staffCookie)
    : adminCookie
      ? await verifyJwt(adminCookie)
      : null
  const actorLabel = payload?.role === 'admin' ? '관리자' : '직원 PIN 인증'

  const qrPayload = await verifyQrToken(parsed.data.token)
  if (!qrPayload) {
    return NextResponse.json({ success: false, reason: 'INVALID_TOKEN' }, { status: 400 })
  }

  const db = createServerClient()

  const { data: materials } = await db
    .from('materials')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  if (!materials?.length) {
    return NextResponse.json({ success: false, reason: 'NO_MATERIALS' })
  }

  const { data: allLogs } = await db
    .from('distribution_logs')
    .select('material_id')
    .eq('student_id', qrPayload.sid)
  const receivedIds = new Set((allLogs ?? []).map((log) => log.material_id))

  const unreceived = materials.filter((material) => !receivedIds.has(material.id))

  if (unreceived.length === 0) {
    return NextResponse.json({ success: false, reason: 'ALL_RECEIVED' })
  }

  if (parsed.data.material_id) {
    const targetMaterial = materials.find((material) => material.id === parsed.data.material_id)
    if (!targetMaterial) {
      return NextResponse.json({ success: false, reason: 'INVALID_MATERIAL' }, { status: 400 })
    }
    if (receivedIds.has(parsed.data.material_id)) {
      return NextResponse.json({
        success: false,
        reason: 'ALREADY_RECEIVED',
        materialName: targetMaterial.name,
      })
    }

    try {
      const result = await distributeMaterial({
        studentId: qrPayload.sid,
        materialId: parsed.data.material_id,
        distributedBy: actorLabel,
      })
      if (!result.success) {
        return NextResponse.json({
          success: false,
          reason: result.reason === 'already_distributed' ? 'ALREADY_RECEIVED' : 'DB_ERROR',
        })
      }

      const { data: student } = await db
        .from('students')
        .select('name, exam_number, series, region')
        .eq('id', qrPayload.sid)
        .single()

      return NextResponse.json({
        success: true,
        materialName: targetMaterial.name,
        studentName: student?.name ?? '',
        examNumber: student?.exam_number ?? '',
        series: student?.series ?? '',
        region: student?.region ?? '',
        distributedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      })
    } catch {
      return NextResponse.json({ success: false, reason: 'DB_ERROR' }, { status: 500 })
    }
  }

  if (unreceived.length === 1) {
    const nextMaterial = unreceived[0]
    try {
      const result = await distributeMaterial({
        studentId: qrPayload.sid,
        materialId: nextMaterial.id,
        distributedBy: actorLabel,
      })
      if (!result.success) {
        return NextResponse.json({
          success: false,
          reason: result.reason === 'already_distributed' ? 'ALREADY_RECEIVED' : 'DB_ERROR',
        })
      }

      const { data: student } = await db
        .from('students')
        .select('name, exam_number, series, region')
        .eq('id', qrPayload.sid)
        .single()

      return NextResponse.json({
        success: true,
        materialName: nextMaterial.name,
        studentName: student?.name ?? '',
        examNumber: student?.exam_number ?? '',
        series: student?.series ?? '',
        region: student?.region ?? '',
        distributedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      })
    } catch {
      return NextResponse.json({ success: false, reason: 'DB_ERROR' }, { status: 500 })
    }
  }

  const { data: student } = await db
    .from('students')
    .select('name, exam_number, series, region')
    .eq('id', qrPayload.sid)
    .single()

  return NextResponse.json({
    success: false,
    reason: 'NEEDS_SELECTION',
    needsSelection: true,
    unreceived,
    studentName: student?.name ?? '',
    examNumber: student?.exam_number ?? '',
    series: student?.series ?? '',
    region: student?.region ?? '',
  })
}
