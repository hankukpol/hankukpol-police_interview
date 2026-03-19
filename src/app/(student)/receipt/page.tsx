'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import type { Student, Material } from '@/types/database'
import { formatKoreanDate } from '@/lib/utils'

function isStudent(obj: unknown): obj is Student {
  if (typeof obj !== 'object' || obj === null) return false
  const s = obj as Record<string, unknown>
  return typeof s.id === 'string' && typeof s.name === 'string' && typeof s.phone === 'string'
}

interface ReceiptData {
  student: Student
  materials: Material[]
  receipts: Record<number, string>   // material_id → distributed_at
  token: string
  appName: string
  popups: { notice: { title: string; body: string; active: boolean }; refund: { title: string; body: string; active: boolean } }
}

const POLL_INTERVAL = 10000 // 10초

export default function ReceiptPage() {
  const router = useRouter()
  const [data, setData] = useState<ReceiptData | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [modal, setModal] = useState<'notice' | 'refund' | 'back-confirm' | null>(null)
  const [dateStr, setDateStr] = useState('')
  const [newlyReceived, setNewlyReceived] = useState<Set<number>>(new Set())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevReceiptsRef = useRef<Record<number, string>>({})
  const studentIdRef = useRef<string>('')
  const isPollingRef = useRef(false)

  const fetchReceipts = useCallback(async () => {
    if (!studentIdRef.current || isPollingRef.current) return
    isPollingRef.current = true
    let rec: { receipts?: Record<number, string> } = {}
    try {
      const res = await fetch(`/api/students/${studentIdRef.current}/receipts`)
      if (!res.ok) return
      rec = await res.json()
    } finally {
      isPollingRef.current = false
    }
    const newReceipts: Record<number, string> = rec.receipts ?? {}

    // 새로 수령된 항목 감지
    const prev = prevReceiptsRef.current
    const added = Object.keys(newReceipts).filter(k => !prev[Number(k)]).map(Number)
    if (added.length > 0) {
      setNewlyReceived(s => new Set([...s, ...added]))
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      // 2초 후 애니메이션 클래스 제거
      setTimeout(() => setNewlyReceived(s => {
        const next = new Set(s)
        added.forEach(id => next.delete(id))
        return next
      }), 2000)
    }
    prevReceiptsRef.current = newReceipts
    setData(d => d ? { ...d, receipts: newReceipts } : d)
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('qr_token')
    const studentRaw = sessionStorage.getItem('student')
    if (!token || !studentRaw) { router.replace('/'); return }

    let student: Student
    try {
      const parsed = JSON.parse(studentRaw)
      if (!isStudent(parsed)) { router.replace('/'); return }
      student = parsed
    } catch {
      router.replace('/')
      return
    }
    studentIdRef.current = student.id

    Promise.all([
      fetch('/api/materials').then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`/api/students/${student.id}/receipts`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`/api/config/popups`).then(r => r.json()),
      fetch(`/api/config/app`).then(r => r.json()),
    ]).then(([mats, rec, popArr, appCfg]) => {
      const arr = Array.isArray(popArr) ? popArr : []
      const noticeRow = arr.find((p: { popup_key: string }) => p.popup_key === 'notice')
      const refundRow = arr.find((p: { popup_key: string }) => p.popup_key === 'refund_policy')
      const popups = {
        notice: { title: noticeRow?.title ?? '공지사항', body: noticeRow?.body ?? '', active: noticeRow?.is_active ?? false },
        refund: { title: refundRow?.title ?? '환불규정', body: refundRow?.body ?? '', active: refundRow?.is_active ?? false },
      }
      const receipts = rec.receipts ?? {}
      const appName = appCfg?.app_name ?? '경찰 면접 모바일 수강증'
      prevReceiptsRef.current = receipts
      setData({ student, materials: mats.materials ?? [], receipts, token, appName, popups })
      if (popups.notice.active) setModal('notice')
    }).catch(() => setFetchError(true))

    // 날짜 표시 타이머
    const updateDate = () => setDateStr(formatKoreanDate())
    updateDate()
    timerRef.current = setInterval(updateDate, 60000)

    // 10초 폴링
    pollRef.current = setInterval(fetchReceipts, POLL_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router, fetchReceipts])

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modal])

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
        <p className="text-gray-500 text-center">데이터를 불러오지 못했습니다.<br />잠시 후 다시 시도해 주세요.</p>
        <button
          onClick={() => { setFetchError(false); window.location.reload() }}
          className="px-6 py-2 text-sm text-white font-medium"
          style={{ background: 'var(--theme)' }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { student, materials, receipts, token } = data
  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan?token=${encodeURIComponent(token)}`
  const activeMaterials = materials.filter(m => m.is_active)
  const receivedCount = activeMaterials.filter(m => !!receipts[m.id]).length
  const allReceived = activeMaterials.length > 0 && receivedCount === activeMaterials.length
  const nextMaterialId = activeMaterials.find(m => !receipts[m.id])?.id

  return (
    <div className="flex flex-col min-h-dvh">
      {/* 헤더 */}
      <div className="text-white text-center py-5 px-4" style={{ background: 'var(--theme)' }}>
        <h1 className="text-xl font-bold whitespace-pre-wrap">
          {(data.appName || '').split(/<br\s*\/?>/i).map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="text-sm mt-1 text-white/80">{dateStr}</p>
      </div>

      {/* 학생 정보 */}
      <section className="p-4 border-t border-gray-100">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--theme)' }}>학생 정보</h2>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['이름', student.name],
              ['수험번호', student.exam_number ?? '-'],
              ['성별', student.gender ?? '-'],
              ['응시지역', student.region ?? '-'],
              ['직렬', student.series ?? '-'],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 text-gray-500 w-24">{k}</td>
                <td className="py-2 font-medium text-gray-900">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* QR 코드 */}
      <section className="p-4 border-t border-gray-100 text-center">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--theme)' }}>개인 QR 코드</h2>
        <div className="inline-block p-3 border-2 border-gray-100 mb-2">
          <QRCodeSVG value={qrUrl} size={220} level="M" />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--theme)' }}>
          인증된 직원 휴대폰으로 QR을 스캔해 주세요
        </p>
      </section>

      {/* 자료 수령 현황 */}
      <section className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--theme)' }}>자료 수령 현황</h2>
          {activeMaterials.length > 0 && (
            <span
              className={`text-xs font-bold px-2 py-0.5 ${
                allReceived ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {receivedCount} / {activeMaterials.length} 수령
            </span>
          )}
        </div>

        {/* 모두 수령 완료 배너 */}
        {allReceived && (
          <div className="mb-3 py-3 px-4 bg-green-50 border border-green-200 flex items-center gap-2">
            <span className="text-green-700 text-base">✓</span>
            <span className="text-sm font-bold text-green-800">모든 자료를 수령하였습니다!</span>
          </div>
        )}

        {activeMaterials.length === 0 && (
          <p className="text-sm text-gray-400 py-2">배부 예정 자료가 없습니다.</p>
        )}
        <ul className="flex flex-col gap-1">
          {activeMaterials.map(m => {
            const received = !!receipts[m.id]
            const isNext = m.id === nextMaterialId
            const isNew = newlyReceived.has(m.id)
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 py-2 px-2 transition-colors duration-500 ${
                  isNew ? 'bg-green-50' : isNext ? 'bg-blue-50' : ''
                }`}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all duration-500 ${
                    received ? 'bg-green-700 border-green-700 text-white' : 'border-gray-300'
                  } ${isNew ? 'scale-125' : ''}`}
                >
                  {received && '✓'}
                </span>
                <span className={`text-sm font-medium ${isNext ? 'text-blue-900 underline font-bold' : 'text-gray-700'}`}>
                  {m.name}
                </span>
                <span className="text-xs ml-auto">
                  {received
                    ? <span className="text-green-700 font-medium">{receipts[m.id]}</span>
                    : isNext
                      ? <span className="text-gray-400">미수령 ← 다음</span>
                      : <span className="text-gray-300">미수령</span>
                  }
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 팝업 버튼 */}
      <div className="flex gap-3 px-4 pb-2 mt-auto">
        {data.popups?.notice?.active && (
          <button
            onClick={() => setModal('notice')}
            className="flex-1 py-3 text-sm font-medium"
            style={{ background: '#e8eaf6', color: 'var(--theme)' }}
          >
            공지사항
          </button>
        )}
        {data.popups?.refund?.active && (
          <button
            onClick={() => setModal('refund')}
            className="flex-1 py-3 text-sm font-medium"
            style={{ background: '#e8eaf6', color: 'var(--theme)' }}
          >
            환불규정
          </button>
        )}
      </div>
      <div className="px-4 pb-6">
        <button
          onClick={() => setModal('back-confirm')}
          className="w-full py-3 text-sm text-gray-500 border border-gray-200"
        >
          처음으로
        </button>
      </div>

      {/* 팝업 모달 */}
      {modal === 'back-confirm' && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-5"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white w-full max-w-sm flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-5">
              <p className="text-base font-bold text-gray-800 mb-1">처음 화면으로 돌아가시겠습니까?</p>
              <p className="text-sm text-gray-500">현재 화면 정보가 초기화됩니다.</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 text-sm text-gray-500 border-r border-gray-100"
              >
                취소
              </button>
              <button
                onClick={() => { sessionStorage.clear(); router.push('/') }}
                className="flex-1 py-3 text-sm font-medium text-white"
                style={{ background: 'var(--theme)' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'notice' || modal === 'refund') && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-5"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white w-full max-w-sm flex flex-col overflow-hidden"
            style={{ maxHeight: '80dvh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-bold" style={{ color: 'var(--theme)' }}>
                {modal === 'notice' ? data.popups.notice.title : data.popups.refund.title}
              </span>
              <button
                onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 text-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {modal === 'notice' ? data.popups.notice.body : data.popups.refund.body}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="w-full py-2.5 text-sm font-medium text-white"
                style={{ background: 'var(--theme)' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
