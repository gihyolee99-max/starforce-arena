import { useEffect, useRef, useState } from 'react'

export function ChatPanel({ messages, onSend }) {
  const [draft, setDraft] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function submit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="mmorpg-panel chat-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 900 }}>실시간 채팅</div>
        <span className="mmorpg-tag">WORLD</span>
      </div>

      <div className="mmorpg-scroll chat-log">
        {messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.92rem' }}>
            아직 채팅이 없습니다.
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={`${m.ts}-${idx}`}
              style={{
                marginBottom: 8,
                textAlign: 'left',
                color: m.system ? 'var(--text-muted)' : 'var(--text)',
                fontSize: '0.92rem',
                lineHeight: 1.35,
              }}
            >
              {m.system ? (
                <span style={{ fontStyle: 'italic' }}>{m.message}</span>
              ) : (
                <>
                  <span style={{ color: 'var(--gold-dim)', fontWeight: 900 }}>{m.nickname}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}> : </span>
                  <span>{m.text}</span>
                </>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input
          className="mmorpg-input"
          style={{ maxWidth: 'unset', flex: 1, padding: '10px 12px', fontSize: '0.95rem' }}
          placeholder="메시지 입력"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
        />
        <button className="mmorpg-btn mmorpg-btn--ghost" type="submit" style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
          전송
        </button>
      </form>
    </div>
  )
}
