'use client'

import { useEffect, useState, useCallback } from 'react'

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

interface Log {
  id: number
  distributed_at: string
  distributed_by: string
  note: string
  students: { name: string; exam_number: string | null; series: string | null; region: string | null }
  materials: { name: string }
}

function getTodayKST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [exportFrom, setExportFrom] = useState(getTodayKST)
  const [exportTo, setExportTo] = useState(getTodayKST)
  const [exportAll, setExportAll] = useState(false)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetch(`/api/distribution/logs?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  function handleSearch() {
    setPage(1)
    setSearch(searchInput.trim())
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    await fetch(`/api/distribution/logs/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setConfirmDeleteId(null)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          배부 로그 <span className="text-base text-gray-400 font-normal">({total}건)</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={exportAll} onChange={e => setExportAll(e.target.checked)} className="w-3.5 h-3.5" />
            전체 기간
          </label>
          {!exportAll && (
            <>
              <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 focus:outline-none focus:border-blue-900" />
              <span className="text-xs text-gray-400">~</span>
              <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 focus:outline-none focus:border-blue-900" />
            </>
          )}
          <a
            href={exportAll ? '/api/distribution/logs/export?all=1' : `/api/distribution/logs/export?date_from=${exportFrom}&date_to=${exportTo}`}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
          >
            CSV 내보내기
          </a>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="이름, 수험번호, 핸드폰번호로 검색"
          className="flex-1 px-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-blue-900"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 text-sm font-medium text-white"
          style={{ background: 'var(--theme)' }}
        >
          검색
        </button>
        {search && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
            className="px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-600 bg-white"
          >
            초기화
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['일시', '학생', '수험번호', '구분', '응시청', '자료', '처리자', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={8} className="text-center py-10 text-red-400">데이터를 불러오지 못했습니다. <button onClick={load} className="underline">다시 시도</button></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">배부 기록이 없습니다.</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(l.distributed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </td>
                <td className="px-4 py-3 font-medium">{l.students?.name}</td>
                <td className="px-4 py-3 text-gray-600">{l.students?.exam_number ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{l.students?.series ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{l.students?.region ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                    {l.materials?.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{l.distributed_by || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {confirmDeleteId === l.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button onClick={() => handleDelete(l.id)} disabled={deletingId === l.id}
                        className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-40">
                        {deletingId === l.id ? '삭제 중...' : '확인'}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">취소</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(l.id)}
                      className="text-xs text-red-500 hover:underline">삭제</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-4 flex-wrap">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 text-sm bg-white text-gray-600 border border-gray-200 disabled:opacity-30">‹</button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
              : <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm border ${p === page ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={p === page ? { background: 'var(--theme)' } : {}}>{p}</button>
          )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 text-sm bg-white text-gray-600 border border-gray-200 disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  )
}
