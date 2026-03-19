'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { normalizePhone, normalizeName } from '@/lib/utils'

const LS_NAME = 'student_name'
const LS_PHONE = 'student_phone'

function maskPhone(phone: string) {
  if (phone.length >= 10) {
    return phone.slice(0, 3) + '-****-' + phone.slice(-4)
  }
  return phone
}

export default function StudentLoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savedName, setSavedName] = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [appName, setAppName] = useState('')

  useEffect(() => {
    const sName = localStorage.getItem(LS_NAME) ?? ''
    const sPhone = localStorage.getItem(LS_PHONE) ?? ''
    if (sName && sPhone) {
      setSavedName(sName)
      setSavedPhone(sPhone)
      setName(sName)
      setPhone(sPhone)
    } else {
      setShowForm(true)
    }
    fetch('/api/config/app').then(r => r.json()).then((cfg: { app_name?: string }) => {
      if (cfg.app_name) setAppName(cfg.app_name)
    }).catch(() => {})
  }, [])

  async function login(loginName: string, loginPhone: string) {
    const n = normalizeName(loginName)
    const p = normalizePhone(loginPhone)
    if (!n || !p) return
    setError('')
    setLoading(true)
    try {
      if (p.length < 10) { setError('연락처를 올바르게 입력해 주세요. (숫자 10자리 이상)'); return }
      const res = await fetch('/api/students/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, phone: p }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '로그인에 실패했습니다.'); return }
      localStorage.setItem(LS_NAME, loginName)
      localStorage.setItem(LS_PHONE, loginPhone)
      sessionStorage.setItem('qr_token', data.token)
      sessionStorage.setItem('student', JSON.stringify(data.student))
      router.push('/receipt')
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickLogin() {
    await login(savedName, savedPhone)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(name, phone)
  }

  function handleOtherUser() {
    setSavedName('')
    setSavedPhone('')
    setName('')
    setPhone('')
    setError('')
    setShowForm(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-white p-6">
      <div className="w-full max-w-[320px] flex flex-col gap-10">
        {/* 타이틀 / 로고 */}
        <h1 className="text-2xl font-extrabold text-center tracking-tight break-keep text-gray-900 whitespace-pre-wrap">
          {(appName || '경찰 면접 모바일 수강증').split(/<br\s*\/?>/i).map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </h1>

        <div className="flex flex-col w-full">
          {/* 저장된 정보 빠른 로그인 */}
          {savedName && !showForm && (
            <div className="flex flex-col gap-6">
              <div className="bg-[#f0f4ff] p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{savedName}</p>
                  <p className="text-sm text-gray-600 mt-1">{maskPhone(savedPhone)}</p>
                </div>
                <button
                  onClick={handleOtherUser}
                  className="text-sm text-gray-500 hover:text-gray-800 underline transition-colors"
                >
                  다른 계정
                </button>
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <button
                onClick={handleQuickLogin}
                disabled={loading}
                className="w-full py-4 text-white font-bold text-lg transition-opacity disabled:opacity-60"
                style={{ background: 'var(--theme)' }}
              >
                {loading ? '로그인 중...' : '바로 로그인'}
              </button>
            </div>
          )}

          {/* 직접 입력 폼 */}
          {showForm && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-0.5 bg-white">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="이름"
                  autoComplete="name"
                  autoFocus
                  className="w-full px-4 py-4 bg-[#f0f4ff] text-base focus:outline-none focus:bg-[#e4ebff] transition-colors placeholder:text-gray-500 text-gray-900 border-none"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="연락처 (숫자만)"
                  autoComplete="tel"
                  inputMode="numeric"
                  className="w-full px-4 py-4 bg-[#f0f4ff] text-base focus:outline-none focus:bg-[#e4ebff] transition-colors placeholder:text-gray-500 text-gray-900 border-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-white font-bold text-lg transition-opacity disabled:opacity-60"
                style={{ background: 'var(--theme)' }}
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
