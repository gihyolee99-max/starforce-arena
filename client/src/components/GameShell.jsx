import { useState } from 'react'
import { EquipmentPanel } from './EquipmentPanel.jsx'
import { ChatPanel } from './ChatPanel.jsx'
import { RankingPanel } from './RankingPanel.jsx'
import { OnlineUsers } from './OnlineUsers.jsx'
import { EnhanceFeed } from './EnhanceFeed.jsx'
import { MarketPanel } from './MarketPanel.jsx'

export function GameShell({
  nickname,
  connected,
  level,
  rates,
  enhanceBusy,
  marketBusy,
  lastOutcome,
  onEnhance,
  onSellWeapon,
  onBuyShopItem,
  onEquipWeapon,
  onLeave,
  messages,
  onSendChat,
  ranking,
  users,
  socketId,
  feed,
  playerState,
}) {
  const maxed = level >= 30
  const [useProtection, setUseProtection] = useState(false)

  return (
    <div className="mmorpg-root" style={{ padding: '16px 14px 22px' }}>
      <header className="game-header">
        <div style={{ textAlign: 'left' }}>
          <div className="mmorpg-tag" style={{ marginBottom: 8 }}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="mmorpg-title" style={{ fontSize: 'clamp(1.25rem, 3.2vw, 1.75rem)' }}>
            Starforce Arena
          </div>
          <div className="mmorpg-sub" style={{ marginTop: 6 }}>
            접속 유저: <span style={{ color: 'var(--gold-dim)', fontWeight: 900 }}>{nickname}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="wallet-pill">{Number(playerState.gold || 0).toLocaleString('ko-KR')} G</div>
          <div className="wallet-pill wallet-pill--blue">보호권 {playerState.protectionScrolls || 0}</div>
          <button type="button" className="mmorpg-btn mmorpg-btn--ghost" onClick={onLeave}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="mmorpg-grid">
        <aside className="side-stack">
          <OnlineUsers users={users} selfId={socketId} />
          <RankingPanel ranking={ranking} nickname={nickname} />
        </aside>

        <main className="arena-layout">
          <EquipmentPanel
            level={level}
            weapon={playerState.weapon}
            rates={rates}
            busy={enhanceBusy}
            maxed={maxed}
            gold={playerState.gold}
            enhanceCost={playerState.enhanceCost}
            protectionScrolls={playerState.protectionScrolls}
            useProtection={useProtection}
            onProtectionChange={setUseProtection}
            onEnhance={() => onEnhance(useProtection)}
            lastOutcome={lastOutcome}
          />
          <ChatPanel messages={messages} onSend={onSendChat} />
          <MarketPanel
            gold={playerState.gold}
            activeWeaponId={playerState.activeWeaponId}
            inventory={playerState.inventory}
            shopItems={playerState.shopItems}
            priceTable={playerState.priceTable}
            busy={marketBusy}
            onEquip={onEquipWeapon}
            onSell={onSellWeapon}
            onBuy={onBuyShopItem}
          />
          <EnhanceFeed feed={feed} />
        </main>
      </div>
    </div>
  )
}
