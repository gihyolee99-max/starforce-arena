import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function formatRates(rates) {
  if (!rates) return null
  return [
    { key: 'success', label: '성공', value: rates.success, color: 'var(--success)' },
    { key: 'fail', label: '실패', value: rates.fail, color: 'var(--info)' },
    { key: 'destroy', label: '파괴', value: rates.destroy, color: 'var(--danger)' },
  ]
}

const EQUIPMENT_IMAGE = '/equipment.jpg.jpeg'

export function EquipmentPanel({ level, weapon, rates, busy, maxed, onEnhance, lastOutcome }) {
  const [equipImgFailed, setEquipImgFailed] = useState(false)
  const rows = useMemo(() => formatRates(rates), [rates])

  const pulseKey = lastOutcome
    ? `${lastOutcome.outcome}-${lastOutcome.oldLevel}-${lastOutcome.newLevel}`
    : `${weapon?.id ?? 'weapon'}-${level}`

  const tierLabel = maxed ? 'MAX' : `+${level}`

  const glow =
    lastOutcome?.outcome === 'success'
      ? 'rgba(92, 246, 195, 0.55)'
      : lastOutcome?.outcome === 'fail'
        ? 'rgba(125, 211, 252, 0.45)'
        : lastOutcome?.outcome === 'destroy'
          ? 'rgba(255, 77, 109, 0.65)'
          : 'rgba(217, 70, 239, 0.45)'

  return (
    <div className="mmorpg-panel equipment-panel">
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -40,
          background: `radial-gradient(420px 240px at 50% 20%, ${glow}, transparent 60%)`,
          opacity: lastOutcome ? 1 : 0.55,
          transition: 'opacity 0.35s ease',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div className="mmorpg-tag" style={{ marginBottom: 12 }}>
          장비 강화
        </div>

        <motion.div
          key={pulseKey}
          initial={{ scale: 0.98, opacity: 0.85 }}
          animate={{
            scale: [1, 1.03, 1],
            rotate: lastOutcome?.outcome === 'fail' ? [0, -2, 2, -1, 1, 0] : [0, 0, 0],
          }}
          transition={{ duration: lastOutcome?.outcome === 'fail' ? 0.55 : 0.45 }}
          className="equipment-frame"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pulseKey + '-burst'}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.25, 1.45] }}
              transition={{ duration: 0.65 }}
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: 22,
                pointerEvents: 'none',
                background:
                  lastOutcome?.outcome === 'success'
                    ? 'radial-gradient(circle, rgba(92,246,195,0.55), transparent 60%)'
                    : lastOutcome?.outcome === 'destroy'
                      ? 'radial-gradient(circle, rgba(255,77,109,0.65), transparent 62%)'
                      : 'radial-gradient(circle, rgba(125,211,252,0.45), transparent 62%)',
              }}
            />
          </AnimatePresence>

          {!equipImgFailed ? (
            <img
              src={EQUIPMENT_IMAGE}
              alt="강화 장비"
              draggable={false}
              onError={() => setEquipImgFailed(true)}
              style={{
                width: '86%',
                height: '86%',
                objectFit: 'cover',
                borderRadius: 14,
                boxShadow: '0 0 24px rgba(245, 215, 66, 0.25)',
              }}
            />
          ) : (
            <div style={{ fontSize: 'clamp(4.2rem, 14vw, 6.2rem)', lineHeight: 1 }}>⚔</div>
          )}

          <div className="equipment-caption">
            <span>{weapon?.name ?? '수련용 검'}</span>
            <span>+1 ~ +30</span>
          </div>
        </motion.div>

        <div className="equipment-level">{tierLabel}</div>

        <div style={{ marginTop: 8, minHeight: 26 }}>
          {lastOutcome ? (
            <motion.div
              key={pulseKey + '-msg'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontWeight: 800,
                color:
                  lastOutcome.outcome === 'success'
                    ? 'var(--success)'
                    : lastOutcome.outcome === 'fail'
                      ? 'var(--info)'
                      : 'var(--danger)',
              }}
            >
              {lastOutcome.outcome === 'success'
                ? `강화 성공! +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`
                : lastOutcome.outcome === 'fail'
                  ? `강화 실패 +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`
                  : `장비 파괴! +${lastOutcome.oldLevel} → +${lastOutcome.newLevel}`}
            </motion.div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              서버가 확률을 계산합니다. 운을 걸어보세요.
            </div>
          )}
        </div>

        <div className="rate-grid">
          {maxed ? (
            <div className="rate-card" style={{ gridColumn: '1 / -1', color: 'var(--gold)' }}>
              +30 달성! 더 이상 강화할 수 없습니다.
            </div>
          ) : rows ? (
            rows.map((r) => (
              <div key={r.key} className="rate-card" style={{ borderColor: `${r.color}55` }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: r.color }}>{r.value}%</div>
              </div>
            ))
          ) : (
            <div className="rate-card" style={{ gridColumn: '1 / -1' }}>
              확률 정보를 불러오는 중
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="mmorpg-btn"
            onClick={onEnhance}
            disabled={busy || maxed}
            style={{ minWidth: 220, padding: '16px 22px', fontSize: '1.08rem' }}
          >
            {maxed ? '최대 강화 달성' : busy ? '강화 중...' : '강화 시도'}
          </button>
        </div>
      </div>
    </div>
  )
}
