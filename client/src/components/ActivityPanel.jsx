import { useState } from 'react'

function formatGold(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')} G`
}

export function ActivityPanel({
  users,
  nickname,
  attendance,
  miniGameCooldownMs,
  pendingDuel,
  lastDuelResult,
  lastMiniGameReward,
  busy,
  onMiniGame,
  onAttendance,
  onChallenge,
  onAcceptDuel,
}) {
  const opponents = users.filter((user) => user.nickname !== nickname)
  const [target, setTarget] = useState('')
  const cooldownSeconds = Math.ceil((miniGameCooldownMs || 0) / 1000)

  return (
    <div className="mmorpg-panel activity-panel">
      <div className="panel-heading">
        <div>
          <strong>일일 활동</strong>
          <span>출석 · 룬 채굴 · 1대1 대결</span>
        </div>
      </div>

      <div className="activity-grid">
        <section className="activity-card">
          <div>
            <strong>출석 체크</strong>
            <span>
              {formatGold(attendance?.rewardGold)} + 보호권 {attendance?.rewardProtectionScrolls ?? 0}개
            </span>
          </div>
          <button
            type="button"
            className="mmorpg-btn mmorpg-btn--ghost"
            disabled={busy || attendance?.claimedToday}
            onClick={onAttendance}
          >
            {attendance?.claimedToday ? '오늘 완료' : '보상 받기'}
          </button>
        </section>

        <section className="activity-card">
          <div>
            <strong>룬 채굴</strong>
            <span>{lastMiniGameReward ? `최근 +${formatGold(lastMiniGameReward.reward)}` : '짧은 쿨타임 골드 보상'}</span>
          </div>
          <button
            type="button"
            className="mmorpg-btn mmorpg-btn--ghost"
            disabled={busy || cooldownSeconds > 0}
            onClick={onMiniGame}
          >
            {cooldownSeconds > 0 ? `${cooldownSeconds}s` : '채굴'}
          </button>
        </section>

        <section className="activity-card activity-card--duel">
          <div>
            <strong>1대1 대결</strong>
            <span>승리 보상 120,000 G</span>
          </div>
          <div className="duel-controls">
            <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
              <option value="">상대 선택</option>
              {opponents.map((user) => (
                <option key={user.id} value={user.nickname}>
                  {user.nickname}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mmorpg-btn mmorpg-btn--ghost"
              disabled={busy || !target}
              onClick={() => onChallenge(target)}
            >
              신청
            </button>
          </div>
        </section>
      </div>

      {pendingDuel ? (
        <div className="duel-alert">
          <span>{pendingDuel.from}님이 대결을 신청했습니다.</span>
          <button type="button" className="mmorpg-btn" disabled={busy} onClick={() => onAcceptDuel(pendingDuel.id)}>
            수락
          </button>
        </div>
      ) : null}

      {lastDuelResult ? (
        <div className="duel-result">
          승자: <strong>{lastDuelResult.winner}</strong> · 보상 {formatGold(lastDuelResult.reward)}
        </div>
      ) : null}
    </div>
  )
}
