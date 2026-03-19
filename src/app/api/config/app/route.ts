import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyJwt, ADMIN_COOKIE } from '@/lib/auth/jwt'

const getAppConfig = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db
      .from('app_config')
      .select('config_key, config_value')
      .in('config_key', ['app_name', 'theme_color'])
    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      map[row.config_key] = (row.config_value as string).replace(/^"|"$/g, '')
    }
    return {
      app_name: map['app_name'] ?? '경찰 면접 모바일 수강증',
      theme_color: map['theme_color'] ?? '#1a237e',
    }
  },
  ['app-config'],
  { tags: ['app-config'], revalidate: 600 }
)

export async function GET() {
  const cfg = await getAppConfig()
  return NextResponse.json(cfg)
}

const patchSchema = z.object({
  app_name: z.string().min(1).max(50).optional(),
  theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  const payload = token ? await verifyJwt(token) : null
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })

  const db = createServerClient()
  const now = new Date().toISOString()
  if (parsed.data.app_name !== undefined) {
    await db.from('app_config').update({ config_value: JSON.stringify(parsed.data.app_name), updated_at: now }).eq('config_key', 'app_name')
  }
  if (parsed.data.theme_color !== undefined) {
    await db.from('app_config').update({ config_value: JSON.stringify(parsed.data.theme_color), updated_at: now }).eq('config_key', 'theme_color')
  }
  revalidateTag('app-config')
  return NextResponse.json({ success: true })
}
