/**
 * 서버 전용 강화 확률 및 결과 판정 (+0 ~ +30)
 * 성공: +1, 실패: -1 (최소 +0), 파괴: +0으로 초기화
 */

export function getRatesForLevel(currentLevel) {
  let L = currentLevel
  if (L < 0) L = 0
  if (L >= 30) {
    return null
  }

  let success
  let destroy

  if (L < 3) {
    success = 88
    destroy = 0
  } else if (L < 6) {
    success = 80
    destroy = 0
  } else if (L < 10) {
    success = 72
    destroy = 1
  } else if (L < 14) {
    success = 62
    destroy = 2
  } else if (L < 18) {
    success = 52
    destroy = 4
  } else if (L < 22) {
    success = 40
    destroy = 8
  } else if (L < 26) {
    success = 28
    destroy = 14
  } else {
    success = 16
    destroy = 22
  }

  const fail = 100 - success - destroy
  return { success, fail, destroy }
}

export function rollEnhance(currentLevel) {
  if (currentLevel >= 30) {
    return {
      ok: false,
      reason: 'MAX_LEVEL',
      message: '이미 최고 강화 단계입니다.',
    }
  }

  const rates = getRatesForLevel(currentLevel)
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
