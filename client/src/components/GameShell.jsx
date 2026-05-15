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

  return (
    <div className="mmorpg-root" style={{ padding: '16px 14px 22px' }}>
      <header className="game-header">
        <div style={{ textAlign: 'left' }}>
          <div className="mmorpg-tag" style={{ marginBottom: 8 }}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="mmorpg-title" style={{ fontSize: 'clamp(1.25rem, 3.2vw, 1.75rem)' }}>
            스타포스 강화 아레나
          </div>
          <div className="mmorpg-sub" style={{ marginTop: 6 }}>
            접속 기사: <span style={{ color: 'var(--gold-dim)', fontWeight: 900 }}>{nickname}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="wallet-pill">{Number(playerState.gold || 0).toLocaleString('ko-KR')} 골드</div>
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
            onEnhance={onEnhance}
            lastOutcome={lastOutcome}
          />
          <ChatPanel messages={messages} onSend={onSendChat} />
          <MarketPanel
            gold={playerState.gold}
            weapon={playerState.weapon}
            sellValue={playerState.sellValue}
            shopItems={playerState.shopItems}
            busy={marketBusy}
            onSell={onSellWeapon}
            onBuy={onBuyShopItem}
          />
          <EnhanceFeed feed={feed} />
        </main>
      </div>
    </div>
  )
}
