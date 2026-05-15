import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function formatGold(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')} G`
}

function formatRates(rates) {
  if (!rates) return null
  return [
    { key: 'success', label: '성공', value: rates.success, color: 'var(--success)' },
    { key: 'fail', label: '실패', value: rates.fail, color: 'var(--info)' },
    { key: 'destroy', label: '파괴', value: rates.destroy, color: 'var(--danger)' },
  ]
}

function weaponMark(type) {
  const marks = {
    Sword: 'S',
    Greatsword: 'G',
    Spear: 'P',
    Bow: 'B',
    Axe: 'A',
    Staff: 'M',
    Blade: 'D',
  }
  return marks[type] || 'W'
}

export function EquipmentPanel({
  level,
  weapon,
  rates,
  busy,
  maxed,
  gold,
  enhanceCost,
  protectionScrolls,
  useProtection,
  onProtectionChange,
  onEnhance,
  lastOutcome,
}) {
  const [equipImgFailed, setEquipImgFailed] = useState(false)
  const rows = useMemo(() => formatRates(rates), [rates])
  const affordable = gold >= enhanceCost
  const canUseProtection = protectionScrolls > 0

  const pulseKey = lastOutcome
    ? `${lastOutcome.outcome}-${lastOutcome.oldLevel}-${lastOutcome.newLevel}`
    : `${weapon?.uid ?? 'weapon'}-${level}`

  const glow =
    lastOutcome?.outcome === 'success'
      ? 'rgba(92, 246, 195, 0.6)'
      : lastOutcome?.outcome === 'protected'
        ? 'rgba(245, 215, 66, 0.72)'
        : lastOutcome?.outcome === 'fail'
          ? 'rgba(125, 211, 252, 0.48)'
          : lastOutcome?.outcome === 'destroy'
            ? 'rgba(255, 77, 109, 0.7)'
            : 'rgba(217, 70, 239, 0.42)'

  return (
    <div className="mmorpg-panel equipment-panel">
      <div
        aria-hidden
        className="equipment-aura"
        style={{ background: `radial-gradient(420px 240px at 50% 20%, ${glow}, transparent 60%)` }}
      />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div className="equipment-topline">
          <span className={`rarity-chip rarity-${weapon?.rarity || 'common'}`}>{weapon?.rarity || 'common'}</span>
          <span className="mmorpg-tag">{weapon?.type || 'Weapon'}</span>
        </div>

        <motion.div
          key={pulseKey}
          initial={{ scale: 0.98, opacity: 0.85 }}
          animate={{
            scale: lastOutcome?.outcome === 'success' ? [1, 1.06, 1] : [1, 1.02, 1],
            rotate: lastOutcome?.outcome === 'fail' ? [0, -2, 2, -1, 1, 0] : [0, 0, 0],
          }}
          transition={{ duration: lastOutcome?.outcome === 'fail' ? 0.55 : 0.45 }}
          className={`equipment-frame rarity-frame-${weapon?.rarity || 'common'}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${pulseKey}-burst`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.95, 0], scale: [0.6, 1.28, 1.55] }}
              transition={{ duration: 0.7 }}
              className="enhance-burst"
              style={{ background: `radial-gradient(circle, ${glow}, transparent 62%)` }}
            />
          </AnimatePresence>

          {!equipImgFailed ? (
            <img
              src="/equipment.jpg.jpeg"
              alt="강화 장비"
              draggable={false}
              onError={() => setEquipImgFailed(true)}
            />
          ) : (
            <div className="weapon-glyph">{weaponMark(weapon?.type)}</div>
          )}

          <div className="equipment-caption">
            <span>{weapon?.name ?? 'Training Sword'}</span>
            <span>+0 ~ +30</span>
          </div>
        </motion.div>

        <div className="equipment-level">+{level}</div>

        <div className="enhance-message">
          {lastOutcome ? (
            <motion.div key={`${pulseKey}-msg`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {lastOutcome.outcome === 'success'
                ? `강화 성공! +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`
                : lastOutcome.outcome === 'protected'
                  ? `보호권 발동! +${lastOutcome.oldLevel} 유지`
                  : lastOutcome.outcome === 'fail'
                    ? `강화 실패 +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`
                    : `장비 파괴! +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`}
            </motion.div>
          ) : (
            <div>강화 비용과 확률을 확인하고 도전하세요.</div>
          )}
        </div>

        <div className="enhance-cost-row">
          <div>
            <span>강화 비용</span>
            <strong>{formatGold(enhanceCost)}</strong>
          </div>
          <div>
            <span>보유 골드</span>
            <strong>{formatGold(gold)}</strong>
          </div>
          <div>
            <span>보호권</span>
            <strong>{protectionScrolls}개</strong>
          </div>
        </div>

        <label className={`protection-toggle ${!canUseProtection ? 'is-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={useProtection}
            disabled={!canUseProtection}
            onChange={(e) => onProtectionChange(e.target.checked)}
          />
          <span>파괴방지권 사용</span>
        </label>

        <div className="rate-grid">
          {maxed ? (
            <div className="rate-card" style={{ gridColumn: '1 / -1', color: 'var(--gold)' }}>
              +30 달성. 더 이상 강화할 수 없습니다.
            </div>
          ) : rows ? (
            rows.map((r) => (
              <div key={r.key} className="rate-card" style={{ borderColor: `${r.color}55` }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: r.color }}>{r.value}%</div>
              </div>
            ))
          ) : (
            <div className="rate-card" style={{ gridColumn: '1 / -1' }}>확률 정보를 불러오는 중</div>
          )}
        </div>

        <button
          type="button"
          className="mmorpg-btn enhance-button"
          onClick={onEnhance}
          disabled={busy || maxed || !affordable}
        >
          {maxed ? '최대 강화 달성' : busy ? '강화 중...' : affordable ? '강화 시도' : '골드 부족'}
        </button>
      </div>
    </div>
  )
}
