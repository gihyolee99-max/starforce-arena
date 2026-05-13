import { EquipmentPanel } from './EquipmentPanel.jsx'
import { ChatPanel } from './ChatPanel.jsx'
import { RankingPanel } from './RankingPanel.jsx'
import { OnlineUsers } from './OnlineUsers.jsx'
import { EnhanceFeed } from './EnhanceFeed.jsx'

export function GameShell({
  nickname,
  connected,
  level,
  rates,
  enhanceBusy,
  lastOutcome,
  onEnhance,
  onLeave,
  messages,
  onSendChat,
  ranking,
  users,
  socketId,
  feed,
}) {
  const maxed = level >= 30

  return (
    <div className="mmorpg-root" style={{ padding: '16px 14px 22px' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div className="mmorpg-tag" style={{ marginBottom: 8 }}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="mmorpg-title" style={{ fontSize: 'clamp(1.25rem, 3.2vw, 1.75rem)' }}>
            이기효 테스트 강화 아레나
          </div>
          <div className="mmorpg-sub" style={{ marginTop: 6 }}>
            접속 중인 기사: <span style={{ color: 'var(--gold-dim)', fontWeight: 900 }}>{nickname}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="mmorpg-btn mmorpg-btn--ghost" onClick={onLeave}>
            로그아웃
          </button>
        </div>
      </header>

      <div
        className="mmorpg-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: 12,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <OnlineUsers users={users} selfId={socketId} />
          <RankingPanel ranking={ranking} nickname={nickname} />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <EquipmentPanel
            level={level}
            rates={rates}
            busy={enhanceBusy}
            maxed={maxed}
            onEnhance={onEnhance}
            lastOutcome={lastOutcome}
          />
          <EnhanceFeed feed={feed} />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <ChatPanel messages={messages} onSend={onSendChat} />
        </div>
      </div>
    </div>
  )
}
