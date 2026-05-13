export function RankingPanel({ ranking, nickname }) {
  return (
    <div className="mmorpg-panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: '-0.02em' }}>실시간 랭킹</div>
        <span className="mmorpg-tag">이기효 TEST</span>
      </div>

      <div className="mmorpg-scroll" style={{ maxHeight: 320, borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '8px 8px', width: 54 }}>#</th>
              <th style={{ padding: '8px 8px' }}>닉네임</th>
              <th style={{ padding: '8px 8px', textAlign: 'right', width: 90 }}>강화</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                  아직 랭킹 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              ranking.map((row) => {
                const mine = row.nickname === nickname
                return (
                  <tr
                    key={`${row.rank}-${row.nickname}`}
                    style={{
                      borderTop: '1px solid rgba(186,104,255,0.18)',
                      background: mine ? 'rgba(245,215,66,0.08)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '9px 8px', fontWeight: 900, color: 'var(--violet)' }}>{row.rank}</td>
                    <td style={{ padding: '9px 8px', fontWeight: mine ? 900 : 700 }}>{row.nickname}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, color: 'var(--gold)' }}>+{row.level}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
