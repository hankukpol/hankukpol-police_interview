import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

const getThemeConfig = unstable_cache(
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
      <div className="w-full max-w-none mx-auto md:max-w-[768px] md:mx-auto">
        {children}
      </div>
    </main>
  )
}
