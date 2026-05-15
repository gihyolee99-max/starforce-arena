export function OnlineUsers({ users, selfId }) {
  return (
    <div className="mmorpg-panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>접속 유저</div>
        <span className="mmorpg-tag">{users.length}명</span>
      </div>

      <div className="mmorpg-scroll" style={{ maxHeight: 220, display: 'grid', gap: 8 }}>
        {users.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.92rem' }}>접속 정보를 불러오는 중</div>
        ) : (
          users.map((u) => {
            const self = u.id === selfId
            return (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '10px 10px',
                  borderRadius: 12,
                  border: self ? '1px solid rgba(245,215,66,0.45)' : '1px solid rgba(186,104,255,0.22)',
                  background: self ? 'rgba(245,215,66,0.08)' : 'rgba(8,5,18,0.45)',
                }}
              >
                <div style={{ fontWeight: 900 }}>{u.nickname}</div>
                {self ? <span className="mmorpg-tag" style={{ color: 'var(--gold)' }}>ME</span> : <span className="mmorpg-tag">ON</span>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
