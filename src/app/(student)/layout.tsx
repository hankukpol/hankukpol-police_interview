import { unstable_cache } from 'next/cache'
import { createServerClient, hasServerSupabaseEnv } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_THEME_CONFIG = {
  app_name: '\uacbd\ucc30 \uba74\uc811 \ubaa8\ubc14\uc77c \uc218\uac15\uc99d',
  theme_color: '#1a237e',
}

const getThemeConfig = unstable_cache(
  async () => {
    if (!hasServerSupabaseEnv()) {
      return DEFAULT_THEME_CONFIG
    }

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
      app_name: map.app_name ?? DEFAULT_THEME_CONFIG.app_name,
      theme_color: map.theme_color ?? DEFAULT_THEME_CONFIG.theme_color,
    }
  },
  ['app-config'],
  { tags: ['app-config'], revalidate: 600 },
)

export async function generateMetadata() {
  const cfg = await getThemeConfig()
  return { title: cfg.app_name }
}

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getThemeConfig()

  return (
    <main
      className="min-h-dvh bg-white"
      style={{ '--theme': cfg.theme_color } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-none md:max-w-[768px]">
        {children}
      </div>
    </main>
  )
}
