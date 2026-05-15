import { useEffect, useMemo, useState } from 'react'
import { getSocketServerUrl } from '../socket/client.js'

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function formatGold(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')} G`
}

export function AdminPanel() {
  const apiUrl = useMemo(() => getSocketServerUrl(), [])
  const [password, setPassword] = useState(() => localStorage.getItem('starforce-admin-password') || '')
  const [authed, setAuthed] = useState(Boolean(password))
  const [rows, setRows] = useState([])
  const [players, setPlayers] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [grantForm, setGrantForm] = useState({ nickname: '', gold: '4000000', protectionScrolls: '4' })

  async function loadRates() {
    const res = await fetch(`${apiUrl}/api/rates`)
    const data = await res.json()
    if (data.ok) setRows(data.tiers)
  }

  async function loadPlayers(nextPassword = password) {
    if (!nextPassword) return
    const res = await fetch(`${apiUrl}/api/admin/players`, {
      headers: { 'x-admin-password': nextPassword },
    })
    const data = await res.json()
    if (data.ok) setPlayers(data.players)
  }

  useEffect(() => {
    loadRates().catch(() => setMessage('확률 정보를 불러오지 못했습니다.'))
    if (authed) loadPlayers().catch(() => {})
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
      await loadPlayers(password)
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
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
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

  async function grantReward(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${apiUrl}/api/admin/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({
          nickname: grantForm.nickname,
          gold: toNumber(grantForm.gold),
          protectionScrolls: toNumber(grantForm.protectionScrolls),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMessage(data.message || '지급에 실패했습니다.')
        return
      }
      await loadPlayers()
      setMessage(`${grantForm.nickname}에게 보상을 지급했습니다.`)
    } catch {
      setMessage('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function sendApologyReward() {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`${apiUrl}/api/admin/apology-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ gold: 4000000, protectionScrolls: 4 }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMessage(data.message || '사과 보상 지급에 실패했습니다.')
        return
      }
      await loadPlayers()
      setMessage(`사과 보상 지급 완료: ${data.count}명`)
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
            <h1 className="mmorpg-title admin-title">운영자 관리</h1>
            <p className="mmorpg-sub">확률, 유저 보상, 점검 보상을 라이브 서버에 바로 적용합니다.</p>
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
          <div className="admin-sections">
            <form className="mmorpg-panel admin-table-card" onSubmit={saveRates}>
              <div className="admin-section-title">강화 확률</div>
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
                    <input className="mmorpg-input" type="number" min="0" max="100" value={row.success} onChange={(e) => updateRow(index, 'success', e.target.value)} />
                    <div className="admin-fail-value">{row.fail}%</div>
                    <input className="mmorpg-input" type="number" min="0" max="100" value={row.destroy} onChange={(e) => updateRow(index, 'destroy', e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="admin-actions">
                <button className="mmorpg-btn" type="submit" disabled={busy}>
                  라이브 서버에 적용
                </button>
              </div>
            </form>

            <section className="mmorpg-panel admin-table-card">
              <div className="admin-section-title">유저 보상</div>
              <form className="admin-grant-form" onSubmit={grantReward}>
                <input className="mmorpg-input" placeholder="닉네임" value={grantForm.nickname} onChange={(e) => setGrantForm((prev) => ({ ...prev, nickname: e.target.value }))} />
                <input className="mmorpg-input" type="number" placeholder="골드" value={grantForm.gold} onChange={(e) => setGrantForm((prev) => ({ ...prev, gold: e.target.value }))} />
                <input className="mmorpg-input" type="number" placeholder="보호권" value={grantForm.protectionScrolls} onChange={(e) => setGrantForm((prev) => ({ ...prev, protectionScrolls: e.target.value }))} />
                <button className="mmorpg-btn" type="submit" disabled={busy || !grantForm.nickname}>지급</button>
              </form>
              <button className="mmorpg-btn mmorpg-btn--ghost" type="button" disabled={busy} onClick={sendApologyReward}>
                점검 사과 보상 전체 지급: 4,000,000 G + 보호권 4개
              </button>
            </section>

            <section className="mmorpg-panel admin-table-card">
              <div className="admin-section-title">유저 목록</div>
              <div className="admin-player-list">
                {players.map((player) => (
                  <div key={player.nickname} className="admin-player-row">
                    <strong>{player.nickname}</strong>
                    <span>{player.online ? '온라인' : '오프라인'}</span>
                    <span>+{player.level} {player.weaponName}</span>
                    <span>{formatGold(player.gold)}</span>
                    <span>보호권 {player.protectionScrolls}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {message ? <div className="admin-message">{message}</div> : null}
      </main>
    </div>
  )
}
