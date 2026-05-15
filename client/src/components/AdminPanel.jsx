import { useEffect, useMemo, useState } from 'react'
import { getSocketServerUrl } from '../socket/client.js'

function emptyRows() {
  return []
}

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

export function AdminPanel() {
  const apiUrl = useMemo(() => getSocketServerUrl(), [])
  const [password, setPassword] = useState(() => localStorage.getItem('starforce-admin-password') || '')
  const [authed, setAuthed] = useState(Boolean(password))
  const [rows, setRows] = useState(emptyRows)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadRates() {
    const res = await fetch(`${apiUrl}/api/rates`)
    const data = await res.json()
    if (data.ok) setRows(data.tiers)
  }

  useEffect(() => {
    loadRates().catch(() => setMessage('확률 정보를 불러오지 못했습니다.'))
  }, [])

  function updateRow(index, key, value) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, [key]: value }
        const success = toNumber(next.success)
        const destroy = toNumber(next.destroy)
        return { ...next, fail: Math.max(0, 100 - success - destroy) }
      }),
    )
  }

  async function login(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMessage(data.message || '운영자 인증에 실패했습니다.')
        return
      }
      localStorage.setItem('starforce-admin-password', password)
      setAuthed(true)
      setMessage('운영자 인증 완료')
    } catch {
      setMessage('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function saveRates(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const tiers = rows.map((row) => ({
        min: toNumber(row.min),
        max: toNumber(row.max),
        success: toNumber(row.success),
        destroy: toNumber(row.destroy),
      }))
      const res = await fetch(`${apiUrl}/api/admin/rates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ tiers }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMessage(data.message || '저장에 실패했습니다.')
        return
      }
      setRows(data.tiers)
      setMessage('확률이 라이브 서버에 반영됐습니다.')
    } catch {
      setMessage('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mmorpg-root admin-root">
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <div className="mmorpg-tag">ADMIN</div>
            <h1 className="mmorpg-title admin-title">운영자 확률 관리</h1>
            <p className="mmorpg-sub">저장 즉시 다음 강화부터 라이브 서버에 적용됩니다.</p>
          </div>
          <a className="admin-link" href="/">게임으로 돌아가기</a>
        </header>

        {!authed ? (
          <form className="mmorpg-panel admin-login" onSubmit={login}>
            <label htmlFor="admin-password">운영자 비밀번호</label>
            <input
              id="admin-password"
              className="mmorpg-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
              autoFocus
            />
            <button className="mmorpg-btn" type="submit" disabled={busy}>
              {busy ? '확인 중...' : '운영자 입장'}
            </button>
          </form>
        ) : (
          <form className="mmorpg-panel admin-table-card" onSubmit={saveRates}>
            <div className="admin-table">
              <div className="admin-table-head">
                <span>구간</span>
                <span>성공 %</span>
                <span>실패 %</span>
                <span>파괴 %</span>
              </div>
              {rows.map((row, index) => (
                <div className="admin-rate-row" key={`${row.min}-${row.max}`}>
                  <strong>+{row.min} ~ +{row.max}</strong>
                  <input
                    className="mmorpg-input"
                    type="number"
                    min="0"
                    max="100"
                    value={row.success}
                    onChange={(e) => updateRow(index, 'success', e.target.value)}
                  />
                  <div className="admin-fail-value">{row.fail}%</div>
                  <input
                    className="mmorpg-input"
                    type="number"
                    min="0"
                    max="100"
                    value={row.destroy}
                    onChange={(e) => updateRow(index, 'destroy', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="admin-actions">
              <button className="mmorpg-btn" type="submit" disabled={busy}>
                {busy ? '저장 중...' : '라이브 서버에 적용'}
              </button>
              <button
                className="mmorpg-btn mmorpg-btn--ghost"
                type="button"
                onClick={() => {
                  localStorage.removeItem('starforce-admin-password')
                  setAuthed(false)
                  setPassword('')
                }}
              >
                로그아웃
              </button>
            </div>
          </form>
        )}

        {message ? <div className="admin-message">{message}</div> : null}
      </main>
    </div>
  )
}
