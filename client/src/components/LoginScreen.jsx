import { useState } from 'react'

export function LoginScreen({ onStart, busy, error }) {
  const [value, setValue] = useState('')

  function submit(e) {
    e.preventDefault()
    onStart(value)
  }

  return (
    <div className="mmorpg-root login-root">
      <main className="login-shell">
        <section className="login-copy" aria-labelledby="login-title">
          <div className="mmorpg-tag">LIVE MULTIPLAYER</div>
          <h1 id="login-title" className="mmorpg-title login-title">
            Starforce Arena
          </h1>
          <p className="login-lead">
            친구들과 같은 서버에서 강화하고, 판매하고, 더 좋은 무기로 다시 도전하세요.
          </p>

          <div className="login-metrics" aria-label="게임 특징">
            <div>
              <strong>+30</strong>
              <span>최대 강화</span>
            </div>
            <div>
              <strong>LIVE</strong>
              <span>실시간 채팅</span>
            </div>
            <div>
              <strong>SHOP</strong>
              <span>무기 거래</span>
            </div>
          </div>
        </section>

        <section className="login-card" aria-label="게임 접속">
          <div className="login-weapon">
            <img src="/equipment.jpg.jpeg" alt="강화 장비" draggable={false} />
            <div>
              <span>현재 시즌</span>
              <strong>강화 아레나</strong>
            </div>
          </div>

          <form onSubmit={submit} className="login-form">
            <label htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              className="mmorpg-input login-input"
              placeholder="최대 14자"
              maxLength={14}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              disabled={busy}
              aria-label="닉네임"
            />
            {error ? (
              <div role="alert" className="login-error">
                {error}
              </div>
            ) : null}
            <button className="mmorpg-btn login-submit" type="submit" disabled={busy}>
              {busy ? '서버 접속 중...' : '아레나 입장'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
