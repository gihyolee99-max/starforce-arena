export const DEFAULT_RATE_TIERS = [
  { min: 0, max: 2, success: 88, destroy: 0 },
  { min: 3, max: 5, success: 80, destroy: 0 },
  { min: 6, max: 9, success: 72, destroy: 1 },
  { min: 10, max: 13, success: 62, destroy: 2 },
  { min: 14, max: 17, success: 52, destroy: 4 },
  { min: 18, max: 21, success: 40, destroy: 8 },
  { min: 22, max: 25, success: 28, destroy: 14 },
  { min: 26, max: 29, success: 16, destroy: 22 },
]

export function normalizeRateTiers(rawTiers = DEFAULT_RATE_TIERS) {
  if (!Array.isArray(rawTiers)) return DEFAULT_RATE_TIERS

  return rawTiers.map((tier, index) => {
    const fallback = DEFAULT_RATE_TIERS[index] ?? DEFAULT_RATE_TIERS.at(-1)
    const min = Number.isFinite(Number(tier?.min)) ? Number(tier.min) : fallback.min
    const max = Number.isFinite(Number(tier?.max)) ? Number(tier.max) : fallback.max
    const success = Math.max(0, Math.min(100, Number(tier?.success) || 0))
    const destroy = Math.max(0, Math.min(100 - success, Number(tier?.destroy) || 0))
    return {
      min: Math.max(0, Math.min(29, min)),
      max: Math.max(0, Math.min(29, max)),
      success,
      destroy,
    }
  })
}

export function getRatesForLevel(currentLevel, rateTiers = DEFAULT_RATE_TIERS) {
  let L = currentLevel
  if (L < 0) L = 0
  if (L >= 30) return null

  const tiers = normalizeRateTiers(rateTiers)
  const tier = tiers.find((entry) => L >= entry.min && L <= entry.max) ?? DEFAULT_RATE_TIERS.at(-1)
  const fail = 100 - tier.success - tier.destroy
  return { success: tier.success, fail, destroy: tier.destroy }
}

export function rollEnhance(currentLevel, rateTiers = DEFAULT_RATE_TIERS) {
  if (currentLevel >= 30) {
    return {
      ok: false,
      reason: 'MAX_LEVEL',
      message: 'Already at max enhancement level.',
    }
  }

  const rates = getRatesForLevel(currentLevel, rateTiers)
  const r = Math.random() * 100
  let outcome
  let newLevel = currentLevel

  if (r < rates.success) {
    outcome = 'success'
    newLevel = Math.min(30, currentLevel + 1)
  } else if (r < rates.success + rates.fail) {
    outcome = 'fail'
    newLevel = Math.max(0, currentLevel - 1)
  } else {
    outcome = 'destroy'
    newLevel = 0
  }

  return {
    ok: true,
    outcome,
    oldLevel: currentLevel,
    newLevel,
    rates,
  }
}
