import { useState } from 'react'

export function LoginScreen({ onStart, busy, error }) {
  const [value, setValue] = useState('')

  function submit(e) {
    e.preventDefault()
    onStart(value)
  }

  return (
    <div
      className="mmorpg-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 18px',
      }}
    >
      <div
        className="mmorpg-panel"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '34px 28px 30px',
          textAlign: 'center',
        }}
      >
        <div className="mmorpg-tag" style={{ marginBottom: 14 }}>
          이기효 · 이동훈 · 이민우
        </div>
        <h1 className="mmorpg-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)' }}>
          테스트 강화 아레나
        </h1>
        <p className="mmorpg-sub">이기효 테스트 서버 — 던파 × 메이플 감성 실시간 멀티 강화</p>

        <form onSubmit={submit} style={{ marginTop: 26, display: 'grid', gap: 14 }}>
          <input
            className="mmorpg-input"
            placeholder="닉네임을 입력하세요 (최대 14자)"
            maxLength={14}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            disabled={busy}
            aria-label="닉네임"
          />
          {error ? (
            <div
              role="alert"
              style={{
                color: 'var(--danger)',
                fontSize: '0.92rem',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}
          <button className="mmorpg-btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '세계에 접속 중…' : '게임 시작'}
          </button>
        </form>
      </div>
    </div>
  )
}
