import { useCallback, useRef, useState } from 'react'
import { createGameSocket } from '../socket/client.js'

const MAX_FEED = 40
const MAX_CHAT = 80

const EMPTY_WEAPON = {
  uid: 'starter',
  catalogId: 'training_sword',
  name: 'Training Sword',
  type: 'Sword',
  rarity: 'common',
  level: 0,
}

const EMPTY_STATE = {
  gold: 0,
  protectionScrolls: 0,
  activeWeaponId: EMPTY_WEAPON.uid,
  weapon: EMPTY_WEAPON,
  inventory: [EMPTY_WEAPON],
  rarityMeta: {},
  shopItems: [],
  enhanceCost: 0,
  sellValue: 0,
  priceTable: [],
  attendance: null,
  miniGameCooldownMs: 0,
  pendingDuel: null,
  lastDuelResult: null,
  lastMiniGameReward: null,
}

export function useEnhanceSession() {
  const socketRef = useRef(null)
  const levelRef = useRef(0)
  const [phase, setPhase] = useState('login')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [level, setLevel] = useState(0)
  const [rates, setRates] = useState(null)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [ranking, setRanking] = useState([])
  const [feed, setFeed] = useState([])
  const [connected, setConnected] = useState(false)
  const [enhanceBusy, setEnhanceBusy] = useState(false)
  const [marketBusy, setMarketBusy] = useState(false)
  const [lastOutcome, setLastOutcome] = useState(null)
  const [socketId, setSocketId] = useState('')
  const [playerState, setPlayerState] = useState(EMPTY_STATE)

  levelRef.current = level

  const applyServerState = useCallback((state) => {
    if (!state) return
    const weapon = state.weapon ?? EMPTY_WEAPON
    setPlayerState((prev) => ({
      pendingDuel: prev.pendingDuel,
      lastDuelResult: prev.lastDuelResult,
      lastMiniGameReward: prev.lastMiniGameReward,
      gold: state.gold ?? 0,
      protectionScrolls: state.protectionScrolls ?? 0,
      activeWeaponId: state.activeWeaponId ?? weapon.uid,
      weapon,
      inventory: Array.isArray(state.inventory) ? state.inventory : [weapon],
      rarityMeta: state.rarityMeta ?? {},
      shopItems: Array.isArray(state.shopItems) ? state.shopItems : [],
      enhanceCost: state.enhanceCost ?? 0,
      sellValue: state.sellValue ?? 0,
      priceTable: Array.isArray(state.priceTable) ? state.priceTable : [],
      attendance: state.attendance ?? null,
      miniGameCooldownMs: state.miniGameCooldownMs ?? 0,
    }))
    setLevel(weapon.level ?? 0)
  }, [])

  const teardownSocket = useCallback(() => {
    const s = socketRef.current
    if (!s) return
    s.removeAllListeners()
    s.disconnect()
    socketRef.current = null
    setConnected(false)
    setSocketId('')
  }, [])

  const pushMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      if (next.length > MAX_CHAT) next.splice(0, next.length - MAX_CHAT)
      return next
    })
  }, [])

  const joinGame = useCallback((name) => {
    const trimmed = String(name ?? '').trim()
    if (!trimmed) {
      setError('닉네임을 입력해 주세요.')
      return
    }

    setError('')
    setNickname(trimmed)
    setPhase('connecting')
    teardownSocket()

    const socket = createGameSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setSocketId(socket.id)
      socket.emit('player:join', { nickname: trimmed }, (ack) => {
        if (!ack?.ok) {
          setError(ack?.message || '접속에 실패했습니다.')
          setPhase('login')
          teardownSocket()
          return
        }
        setRates(ack.ratesPreview ?? null)
        applyServerState(ack.state)
        setPhase('game')
      })
    })

    socket.on('connect_error', (err) => {
      const hint = '서버가 켜져 있는지 확인해 주세요. PowerShell: cd starforce-arena\\server 후 npm run dev'
      setError(err?.message ? `${err.message} - ${hint}` : `서버에 연결할 수 없습니다. ${hint}`)
      setPhase('login')
      teardownSocket()
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('users:update', (list) => setUsers(Array.isArray(list) ? list : []))
    socket.on('ranking:update', (rows) => setRanking(Array.isArray(rows) ? rows : []))
    socket.on('chat:message', (msg) => pushMessage(msg))
    socket.on('chat:system', (msg) => pushMessage({ ...msg, system: true }))
    socket.on('enhance:broadcast', (row) => {
      setFeed((prev) => {
        const next = [row, ...prev]
        if (next.length > MAX_FEED) next.length = MAX_FEED
        return next
      })
    })
    socket.on('rates:update', (nextRates) => setRates(nextRates ?? null))
    socket.on('state:update', (payload) => {
      if (payload?.ratesPreview) setRates(payload.ratesPreview)
      applyServerState(payload?.state)
    })
    socket.on('duel:challenge', (challenge) => {
      pushMessage({
        ts: Date.now(),
        system: true,
        message: `${challenge.from}님이 1대1 대결을 신청했습니다.`,
      })
      setPlayerState((prev) => ({ ...prev, pendingDuel: challenge }))
    })
    socket.on('duel:result', (result) => {
      setPlayerState((prev) => ({ ...prev, lastDuelResult: result, pendingDuel: null }))
    })

    socket.connect()
  }, [applyServerState, pushMessage, teardownSocket])

  const leaveGame = useCallback(() => {
    teardownSocket()
    setPhase('login')
    setNickname('')
    setLevel(0)
    setRates(null)
    setUsers([])
    setMessages([])
    setRanking([])
    setFeed([])
    setLastOutcome(null)
    setEnhanceBusy(false)
    setMarketBusy(false)
    setSocketId('')
    setError('')
    setPlayerState(EMPTY_STATE)
  }, [teardownSocket])

  const sendChat = useCallback((text) => {
    socketRef.current?.emit('chat:send', { text })
  }, [])

  const requestEnhance = useCallback((useProtection = false) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || enhanceBusy) return
    if (levelRef.current >= 30) return

    setEnhanceBusy(true)
    setLastOutcome(null)
    socket.timeout(8000).emit('enhance:request', { useProtection }, (err, ack) => {
      setEnhanceBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '강화를 처리할 수 없습니다.')
        return
      }
      setError('')
      setRates(ack.nextRates ?? null)
      applyServerState(ack.state)
      setLastOutcome({
        outcome: ack.outcome,
        protectedDestroy: ack.protectedDestroy,
        cost: ack.cost,
        oldLevel: ack.oldLevel,
        newLevel: ack.newLevel,
        rates: ack.rates,
      })
    })
  }, [applyServerState, enhanceBusy])

  const emitMarketAction = useCallback((event, payload, failureMessage) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit(event, payload, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || failureMessage)
        return
      }
      setError('')
      if (ack.ratesPreview) setRates(ack.ratesPreview)
      if (ack.nextRates) setRates(ack.nextRates)
      applyServerState(ack.state)
      setLastOutcome(null)
    })
  }, [applyServerState, marketBusy])

  const equipWeapon = useCallback((weaponId) => {
    emitMarketAction('weapon:equip', { weaponId }, '무기를 장착할 수 없습니다.')
  }, [emitMarketAction])

  const sellWeapon = useCallback((weaponId) => {
    emitMarketAction('weapon:sell', { weaponId }, '무기를 판매할 수 없습니다.')
  }, [emitMarketAction])

  const buyShopItem = useCallback((itemId) => {
    emitMarketAction('shop:buy', { itemId }, '아이템을 구매할 수 없습니다.')
  }, [emitMarketAction])

  const playMiniGame = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('minigame:mine', {}, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '미니게임 보상을 받을 수 없습니다.')
        return
      }
      setError('')
      applyServerState(ack.state)
      setPlayerState((prev) => ({ ...prev, lastMiniGameReward: ack }))
    })
  }, [applyServerState, marketBusy])

  const claimAttendance = useCallback(() => {
    emitMarketAction('attendance:claim', {}, '출석 보상을 받을 수 없습니다.')
  }, [emitMarketAction])

  const challengeDuel = useCallback((targetNickname) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('duel:challenge', { targetNickname }, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '대결 신청에 실패했습니다.')
        return
      }
      setError('')
    })
  }, [marketBusy])

  const acceptDuel = useCallback((challengeId) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('duel:accept', { challengeId }, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '대결 수락에 실패했습니다.')
        return
      }
      setError('')
      setPlayerState((prev) => ({ ...prev, lastDuelResult: ack.result, pendingDuel: null }))
    })
  }, [marketBusy])

  return {
    phase,
    nickname,
    error,
    level,
    rates,
    users,
    messages,
    ranking,
    feed,
    connected,
    enhanceBusy,
    marketBusy,
    lastOutcome,
    socketId,
    playerState,
    joinGame,
    leaveGame,
    sendChat,
    requestEnhance,
    equipWeapon,
    sellWeapon,
    buyShopItem,
    playMiniGame,
    claimAttendance,
    challengeDuel,
    acceptDuel,
  }
}
