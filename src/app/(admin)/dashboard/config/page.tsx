'use client'

import { useEffect, useState } from 'react'

interface Popup {
  popup_key: string
  title: string
  body: string
  is_active: boolean
}

export default function ConfigPage() {
  // ── App config state ─────────────────────────────────────
  const [appName, setAppName] = useState('')
  const [themeColor, setThemeColor] = useState('#1a237e')
  const [appMsg, setAppMsg] = useState('')
  const [appLoading, setAppLoading] = useState(false)

  // ── Popup state ─────────────────────────────────────────
  const [popups, setPopups] = useState<Popup[]>([])
  const [popupFetchError, setPopupFetchError] = useState(false)
  const [savingPopup, setSavingPopup] = useState<Record<string, boolean>>({})
  const [popupMsg, setPopupMsg] = useState('')

  // ── Admin ID state ───────────────────────────────────────
  const [adminId, setAdminId] = useState('')
  const [adminIdMsg, setAdminIdMsg] = useState('')
  const [adminIdLoading, setAdminIdLoading] = useState(false)

  // ── PIN state ────────────────────────────────────────────
  const [staffPin, setStaffPin] = useState('')
  const [staffPinConfirm, setStaffPinConfirm] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [adminPinConfirm, setAdminPinConfirm] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  // ── Cache state ──────────────────────────────────────────
  const [cacheMsg, setCacheMsg] = useState('')
  const [cacheLoading, setCacheLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config/app').then(r => r.json()).then((cfg: { app_name: string; theme_color: string }) => {
      setAppName(cfg.app_name ?? '')
      setThemeColor(cfg.theme_color ?? '#1a237e')
    })
    fetch('/api/config/popups')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setPopups)
      .catch(() => setPopupFetchError(true))
    fetch('/api/auth/admin/id')
      .then(r => r.json())
      .then((d: { id: string }) => setAdminId(d.id ?? ''))
  }, [])

  async function saveAppConfig() {
    setAppLoading(true); setAppMsg('')
    const res = await fetch('/api/config/app', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: appName, theme_color: themeColor }),
    })
    setAppLoading(false)
    setAppMsg(res.ok ? '저장되었습니다.' : '저장 실패')
    setTimeout(() => setAppMsg(''), 3000)
  }

  async function savePopup(popup: Popup) {
    setSavingPopup(prev => ({ ...prev, [popup.popup_key]: true }))
    setPopupMsg('')
    const res = await fetch('/api/config/popups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(popup),
    })
    setSavingPopup(prev => ({ ...prev, [popup.popup_key]: false }))
    if (res.ok) { setPopupMsg('저장되었습니다.') }
    else { const d = await res.json(); setPopupMsg(d.error ?? '저장 실패') }
    setTimeout(() => setPopupMsg(''), 3000)
  }

  function updatePopup(key: string, field: keyof Popup, value: string | boolean) {
    setPopups(prev => prev.map(p => p.popup_key === key ? { ...p, [field]: value } : p))
  }

  async function saveAdminId() {
    setAdminIdLoading(true); setAdminIdMsg('')
    const res = await fetch('/api/auth/admin/id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adminId }),
    })
    setAdminIdLoading(false)
    setAdminIdMsg(res.ok ? '관리자 아이디가 저장되었습니다.' : '저장 실패')
    setTimeout(() => setAdminIdMsg(''), 3000)
  }

  async function changePin(role: 'staff' | 'admin') {
    const pin = role === 'staff' ? staffPin : adminPin
    const confirm = role === 'staff' ? staffPinConfirm : adminPinConfirm
    if (pin.length < 4) { setPinMsg('PIN은 4자리 이상이어야 합니다.'); return }
    if (pin !== confirm) { setPinMsg('PIN이 일치하지 않습니다.'); return }
    setPinLoading(true); setPinMsg('')
    const res = await fetch(`/api/auth/${role}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    setPinLoading(false)
    if (res.ok) {
      setPinMsg(`${role === 'staff' ? '직원' : '관리자'} PIN이 변경되었습니다.`)
      if (role === 'staff') { setStaffPin(''); setStaffPinConfirm('') }
      else { setAdminPin(''); setAdminPinConfirm('') }
    } else {
      const d = await res.json()
      setPinMsg(d.error ?? 'PIN 변경 실패')
    }
    setTimeout(() => setPinMsg(''), 4000)
  }

  async function invalidateCache() {
    setCacheLoading(true); setCacheMsg('')
    const res = await fetch('/api/config/cache/invalidate', { method: 'POST' })
    setCacheLoading(false)
    setCacheMsg(res.ok ? '캐시가 초기화되었습니다.' : '캐시 초기화 실패')
    setTimeout(() => setCacheMsg(''), 3000)
  }

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900'
  const btnPrimary = 'px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'
  const sectionCls = 'bg-white border border-gray-200 p-6 space-y-4'

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* ── 앱 기본 설정 ─────────────────────────────────── */}
      <section className={sectionCls}>
        <h2 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">앱 기본 설정</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">앱 이름 (헤더 제목)</label>
          <input
            type="text"
            value={appName}
            onChange={e => setAppName(e.target.value)}
            className={inputCls}
            placeholder="경찰 면접 모바일 수강증"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">테마 색상</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColor}
              onChange={e => setThemeColor(e.target.value)}
              className="w-12 h-10 border border-gray-200 cursor-pointer p-1"
            />
            <input
              type="text"
              value={themeColor}
              onChange={e => setThemeColor(e.target.value)}
              className="w-32 px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900"
              placeholder="#1a237e"
            />
            <div className="w-10 h-10 border border-gray-200" style={{ background: themeColor }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveAppConfig} disabled={appLoading} className={btnPrimary} style={{ background: 'var(--theme)' }}>
            {appLoading ? '저장 중...' : '저장'}
          </button>
          {appMsg && <p className={`text-sm ${appMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{appMsg}</p>}
        </div>
      </section>

      {/* ── 팝업 콘텐츠 ─────────────────────────────────── */}
      <section className={`${sectionCls} !space-y-0`}>
        <h2 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">팝업 콘텐츠</h2>
        {popupFetchError && (
          <p className="text-sm text-red-500 pt-3">팝업 데이터를 불러오지 못했습니다. 페이지를 새로 고침해 주세요.</p>
        )}
        <div className="space-y-6 pt-4">
          {popups.map(popup => (
            <div key={popup.popup_key} className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{popup.popup_key === 'notice' ? '공지사항' : '환불규정'}</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className={`text-xs font-bold px-2 py-0.5 border ${popup.is_active ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                    {popup.is_active ? '활성' : '비활성'}
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePopup(popup.popup_key, 'is_active', !popup.is_active)}
                    className={`relative w-10 h-6 border transition-colors ${popup.is_active ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white transition-transform ${popup.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </label>
              </div>
              <input
                type="text"
                value={popup.title}
                onChange={e => updatePopup(popup.popup_key, 'title', e.target.value)}
                placeholder="제목"
                className={inputCls}
              />
              <textarea
                value={popup.body}
                onChange={e => updatePopup(popup.popup_key, 'body', e.target.value)}
                placeholder="내용 (줄바꿈 지원)"
                rows={6}
                className={`${inputCls} resize-none`}
              />
              <button
                onClick={() => savePopup(popup)}
                disabled={savingPopup[popup.popup_key]}
                className={btnPrimary}
                style={{ background: 'var(--theme)' }}
              >
                {savingPopup[popup.popup_key] ? '저장 중...' : '저장'}
              </button>
            </div>
          ))}
        </div>
        {popupMsg && (
          <p className={`text-sm pt-2 ${popupMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{popupMsg}</p>
        )}
      </section>

      {/* ── 관리자 아이디 ────────────────────────────────── */}
      <section className={sectionCls}>
        <h2 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">관리자 아이디</h2>
        <p className="text-sm text-gray-500">
          설정 시 로그인 시 아이디+PIN 두 가지를 모두 입력해야 합니다. 비워두면 PIN만으로 로그인됩니다.
        </p>
        <input
          type="text"
          value={adminId}
          onChange={e => setAdminId(e.target.value)}
          placeholder="아이디 (비워두면 PIN만 사용)"
          className={inputCls}
          autoComplete="off"
        />
        <div className="flex items-center gap-3">
          <button onClick={saveAdminId} disabled={adminIdLoading} className={btnPrimary} style={{ background: 'var(--theme)' }}>
            {adminIdLoading ? '저장 중...' : '저장'}
          </button>
          {adminIdMsg && (
            <p className={`text-sm ${adminIdMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{adminIdMsg}</p>
          )}
        </div>
      </section>

      {/* ── PIN 변경 ─────────────────────────────────────── */}
      <section className={`${sectionCls} !space-y-0`}>
        <h2 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">PIN 변경</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-4">
          {/* 직원 PIN */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">직원 PIN</h3>
            <input
              type="password"
              value={staffPin}
              onChange={e => setStaffPin(e.target.value)}
              placeholder="새 PIN (4자리 이상)"
              className={inputCls}
              inputMode="numeric"
            />
            <input
              type="password"
              value={staffPinConfirm}
              onChange={e => setStaffPinConfirm(e.target.value)}
              placeholder="PIN 확인"
              className={inputCls}
              inputMode="numeric"
            />
            <button onClick={() => changePin('staff')} disabled={pinLoading} className={btnPrimary} style={{ background: 'var(--theme)' }}>
              직원 PIN 변경
            </button>
          </div>

          {/* 관리자 PIN */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">관리자 PIN</h3>
            <input
              type="password"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              placeholder="새 PIN (4자리 이상)"
              className={inputCls}
              inputMode="numeric"
            />
            <input
              type="password"
              value={adminPinConfirm}
              onChange={e => setAdminPinConfirm(e.target.value)}
              placeholder="PIN 확인"
              className={inputCls}
              inputMode="numeric"
            />
            <button onClick={() => changePin('admin')} disabled={pinLoading} className={btnPrimary} style={{ background: 'var(--theme)' }}>
              관리자 PIN 변경
            </button>
          </div>
        </div>
        {pinMsg && (
          <p className={`text-sm pt-2 ${pinMsg.includes('실패') || pinMsg.includes('않') ? 'text-red-500' : 'text-green-600'}`}>
            {pinMsg}
          </p>
        )}
      </section>

      {/* ── 캐시 초기화 ──────────────────────────────────── */}
      <section className={`bg-white border border-gray-200 p-6`}>
        <h2 className="text-base font-bold text-gray-800 mb-1 pb-3 border-b border-gray-100">캐시 초기화</h2>
        <p className="text-sm text-gray-500 mt-3 mb-4">
          학생 목록, 자료 목록, 팝업 등 서버 캐시를 즉시 초기화합니다.
          업데이트된 데이터가 바로 반영되어야 할 때 사용하세요.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={invalidateCache}
            disabled={cacheLoading}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {cacheLoading ? '초기화 중...' : '캐시 초기화'}
          </button>
          {cacheMsg && (
            <p className={`text-sm ${cacheMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{cacheMsg}</p>
          )}
        </div>
      </section>
    </div>
  )
}
