import { useCallback, useRef, useState } from 'react'
import { createGameSocket } from '../socket/client.js'

const MAX_FEED = 40
const MAX_CHAT = 80

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
  const [lastOutcome, setLastOutcome] = useState(null)
  const [socketId, setSocketId] = useState('')

  levelRef.current = level

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
        setLevel(ack.level ?? 0)
        setRates(ack.ratesPreview ?? null)
        setPhase('game')
      })
    })

    socket.on('connect_error', (err) => {
      const hint =
        '서버가 켜져 있는지 확인하세요. PowerShell에서: cd starforce-arena\\server → npm run dev (포트 3001)'
      setError(
        err?.message
          ? `${err.message} — ${hint}`
          : `서버에 연결할 수 없습니다. ${hint}`,
      )
      setPhase('login')
      teardownSocket()
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('users:update', (list) => {
      setUsers(Array.isArray(list) ? list : [])
    })

    socket.on('ranking:update', (rows) => {
      setRanking(Array.isArray(rows) ? rows : [])
    })

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

    socket.connect()
  }, [teardownSocket])

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
    setSocketId('')
    setError('')
  }, [teardownSocket])

  const sendChat = useCallback((text) => {
    socketRef.current?.emit('chat:send', { text })
  }, [])

  const requestEnhance = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected || enhanceBusy) return
    if (levelRef.current >= 30) return

    setEnhanceBusy(true)
    setLastOutcome(null)

    socket.timeout(8000).emit('enhance:request', {}, (err, ack) => {
      setEnhanceBusy(false)
      if (err) {
        setError('강화 요청 시간이 초과되었습니다.')
        return
      }
      if (!ack?.ok) {
        setError(ack?.message || '강화를 처리할 수 없습니다.')
        return
      }
      setError('')
      setLevel(ack.newLevel ?? 0)
      setRates(ack.nextRates ?? null)
      setLastOutcome({
        outcome: ack.outcome,
        oldLevel: ack.oldLevel,
        newLevel: ack.newLevel,
        rates: ack.rates,
      })
    })
  }, [enhanceBusy])

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
    lastOutcome,
    socketId,
    joinGame,
    leaveGame,
    sendChat,
    requestEnhance,
  }
}
