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
    setPlayerState({
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
    })
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
    socket.on('chat:message', (msg) => {
      setMessages((prev) => {
        const next = [...prev, msg]
        if (next.length > MAX_CHAT) next.splice(0, next.length - MAX_CHAT)
        return next
      })
    })
    socket.on('chat:system', (msg) => {
      setMessages((prev) => {
        const next = [...prev, { ...msg, system: true }]
        if (next.length > MAX_CHAT) next.splice(0, next.length - MAX_CHAT)
        return next
      })
    })
    socket.on('enhance:broadcast', (row) => {
      setFeed((prev) => {
        const next = [row, ...prev]
        if (next.length > MAX_FEED) next.length = MAX_FEED
        return next
      })
    })
    socket.on('rates:update', (nextRates) => setRates(nextRates ?? null))
    socket.connect()
  }, [applyServerState, teardownSocket])

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
      if (err) {
        setError('강화 요청 시간이 초과됐습니다.')
        return
      }
      if (!ack?.ok) {
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

  const equipWeapon = useCallback((weaponId) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('weapon:equip', { weaponId }, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '무기를 장착할 수 없습니다.')
        return
      }
      setError('')
      setRates(ack.ratesPreview ?? null)
      applyServerState(ack.state)
      setLastOutcome(null)
    })
  }, [applyServerState, marketBusy])

  const sellWeapon = useCallback((weaponId) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('weapon:sell', { weaponId }, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '무기를 판매할 수 없습니다.')
        return
      }
      setError('')
      setRates(ack.ratesPreview ?? null)
      applyServerState(ack.state)
      setLastOutcome(null)
    })
  }, [applyServerState, marketBusy])

  const buyShopItem = useCallback((itemId) => {
    const socket = socketRef.current
    if (!socket || !socket.connected || marketBusy) return
    setMarketBusy(true)
    socket.timeout(8000).emit('shop:buy', { itemId }, (err, ack) => {
      setMarketBusy(false)
      if (err || !ack?.ok) {
        setError(ack?.message || '아이템을 구매할 수 없습니다.')
        return
      }
      setError('')
      setRates(ack.ratesPreview ?? null)
      applyServerState(ack.state)
      setLastOutcome(null)
    })
  }, [applyServerState, marketBusy])

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
  }
}
