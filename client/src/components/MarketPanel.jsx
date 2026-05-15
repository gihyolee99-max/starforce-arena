function formatGold(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')} 골드`
}

export function MarketPanel({ gold, weapon, sellValue, shopItems, busy, onSell, onBuy }) {
  return (
    <div className="mmorpg-panel" style={{ padding: 14, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 900 }}>판매소 / 무기 상점</div>
        <span className="mmorpg-tag">GOLD</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        <div className="market-stat">
          <span>보유 골드</span>
          <strong>{formatGold(gold)}</strong>
        </div>
        <div className="market-stat">
          <span>현재 무기</span>
          <strong>+{weapon?.level ?? 0} {weapon?.name ?? '무기'}</strong>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 12,
          borderRadius: 12,
          border: '1px solid rgba(245,215,66,0.28)',
          background: 'rgba(8,5,18,0.55)',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 800 }}>판매 예상가</div>
          <div style={{ marginTop: 4, color: 'var(--gold)', fontSize: '1.1rem', fontWeight: 950 }}>
            {formatGold(sellValue)}
          </div>
        </div>
        <button
          type="button"
          className="mmorpg-btn mmorpg-btn--danger"
          disabled={busy || !sellValue}
          onClick={onSell}
          style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}
        >
          판매
        </button>
      </div>

      <div className="shop-grid">
        {(shopItems || []).map((item) => {
          const affordable = gold >= item.price
          return (
            <div key={item.id} className="shop-item">
              <div>
                <div style={{ fontWeight: 950 }}>+{item.level} {item.name}</div>
                <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 800 }}>
                  {formatGold(item.price)}
                </div>
              </div>
              <button
                type="button"
                className="mmorpg-btn mmorpg-btn--ghost"
                disabled={busy || !affordable}
                onClick={() => onBuy(item.id)}
                style={{ padding: '9px 12px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
              >
                구매
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
