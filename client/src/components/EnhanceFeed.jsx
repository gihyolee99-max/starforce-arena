function outcomeLabel(outcome) {
  if (outcome === 'success') return '성공'
  if (outcome === 'fail') return '실패'
  return '파괴'
}

function outcomeColor(outcome) {
  if (outcome === 'success') return 'var(--success)'
  if (outcome === 'fail') return 'var(--info)'
  return 'var(--danger)'
}

export function EnhanceFeed({ feed }) {
  return (
    <div className="mmorpg-panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>강화 브로드캐스트</div>
        <span className="mmorpg-tag">LIVE</span>
      </div>

      <div className="mmorpg-scroll" style={{ maxHeight: 250, display: 'grid', gap: 8 }}>
        {feed.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.92rem' }}>아직 강화 소식이 없습니다.</div>
        ) : (
          feed.map((row, idx) => (
            <div key={`${row.ts}-${idx}`} className="feed-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-dim)' }}>{row.nickname}</div>
                <div style={{ fontWeight: 900, color: outcomeColor(row.outcome) }}>{outcomeLabel(row.outcome)}</div>
              </div>
              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>
                {row.weaponName ? `${row.weaponName} ` : ''}+{row.oldLevel} → +{row.newLevel}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
