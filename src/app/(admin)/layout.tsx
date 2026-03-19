'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',           label: '대시보드' },
  { href: '/dashboard/students',  label: '학생 명단' },
  { href: '/dashboard/materials', label: '자료 설정' },
  { href: '/dashboard/logs',      label: '배부 로그' },
  { href: '/dashboard/config',    label: '설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh bg-[#f4f6f8]">
      {/* ── PC 사이드바 ── */}
      <aside className="hidden md:flex flex-col w-64 xl:w-72 bg-[#0f172a] shrink-0">
        {/* 로고 영역 */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              A
            </div>
            <div>
              <div className="text-[13px] font-bold text-white leading-tight">경찰 면접 수강증 관리</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* 관리자 정보 */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-200">관리자</div>
              <div className="text-[10px] text-slate-500">Administrator</div>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-600 tracking-widest uppercase">
            메뉴
          </div>
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center px-4 py-3 text-[14px] transition-colors relative ${
                  active
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-blue-300" />
                )}
                {n.label}
              </Link>
            )
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 콘텐츠 영역 ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* 모바일 상단 바 */}
        <div className="md:hidden bg-[#0f172a] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 flex items-center justify-center text-white font-bold text-[11px]">A</div>
            <span className="text-[13px] font-bold text-white">경찰 면접 수강증 관리</span>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="text-[11px] px-2.5 py-1 border border-slate-700 text-slate-400 hover:text-white"
          >
            로그아웃
          </button>
        </div>

        {/* 모바일 탭 네비게이션 */}
        <nav className="md:hidden flex overflow-x-auto bg-[#1e293b] px-2 py-2 gap-1.5 shrink-0 border-b border-white/5">
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 px-3 py-2 text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto p-5 md:p-8 xl:p-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
