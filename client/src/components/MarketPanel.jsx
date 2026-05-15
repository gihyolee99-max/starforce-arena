import { useMemo, useState } from 'react'

function formatGold(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')} G`
}

function rarityLabel(rarity) {
  const labels = {
    common: '일반',
    rare: '희귀',
    epic: '영웅',
    legendary: '전설',
  }
  return labels[rarity] || rarity
}

export function MarketPanel({
  gold,
  activeWeaponId,
  inventory,
  shopItems,
  priceTable,
  busy,
  onEquip,
  onSell,
  onBuy,
}) {
  const [tab, setTab] = useState('inventory')
  const sortedInventory = useMemo(
    () => [...(inventory || [])].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)),
    [inventory],
  )

  return (
    <div className="mmorpg-panel market-panel">
      <div className="panel-heading">
        <div>
          <strong>상점 / 인벤토리</strong>
          <span>{formatGold(gold)}</span>
        </div>
        <div className="segmented-tabs">
          <button type="button" className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>
            인벤토리
          </button>
          <button type="button" className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>
            상점
          </button>
          <button type="button" className={tab === 'prices' ? 'active' : ''} onClick={() => setTab('prices')}>
            시세표
          </button>
        </div>
      </div>

      {tab === 'inventory' ? (
        <div className="inventory-grid">
          {sortedInventory.map((weapon) => {
            const active = weapon.uid === activeWeaponId
            return (
              <div key={weapon.uid} className={`weapon-card rarity-card-${weapon.rarity} ${active ? 'is-active' : ''}`}>
                <div className="weapon-card-top">
                  <span className={`rarity-chip rarity-${weapon.rarity}`}>{rarityLabel(weapon.rarity)}</span>
                  <strong>+{weapon.level}</strong>
                </div>
                <div className="weapon-card-name">{weapon.name}</div>
                <div className="weapon-card-sub">{weapon.type}</div>
                <div className="weapon-card-actions">
                  <button className="mmorpg-btn mmorpg-btn--ghost" type="button" disabled={busy || active} onClick={() => onEquip(weapon.uid)}>
                    {active ? '장착중' : '장착'}
                  </button>
                  <button className="mmorpg-btn mmorpg-btn--danger" type="button" disabled={busy || sortedInventory.length <= 1} onClick={() => onSell(weapon.uid)}>
                    판매
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {tab === 'shop' ? (
        <div className="shop-list">
          {(shopItems || []).map((item) => {
            const affordable = gold >= item.price
            const isProtection = item.kind === 'protection'
            return (
              <div key={item.id} className={`shop-row ${item.rarity ? `rarity-card-${item.rarity}` : ''}`}>
                <div>
                  <div className="shop-title">
                    {isProtection ? item.name : `+${item.level} ${item.name}`}
                  </div>
                  <div className="shop-meta">
                    {isProtection ? '파괴 시 강화 단계를 보호합니다' : `${rarityLabel(item.rarity)} · ${item.type}`}
                  </div>
                </div>
                <div className="shop-buy">
                  <strong>{formatGold(item.price)}</strong>
                  <button className="mmorpg-btn mmorpg-btn--ghost" type="button" disabled={busy || !affordable} onClick={() => onBuy(item.id)}>
                    구매
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {tab === 'prices' ? (
        <div className="price-table">
          <div className="price-table-head">
            <span>강화</span>
            <span>강화비</span>
            <span>판매가</span>
          </div>
          {(priceTable || []).map((row) => (
            <div key={row.level} className="price-row">
              <strong>+{row.level}</strong>
              <span>{formatGold(row.enhanceCost)}</span>
              <span>{formatGold(row.sellValue)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
