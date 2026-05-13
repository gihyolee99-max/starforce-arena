import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { getRatesForLevel, rollEnhance } from './enhanceEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist')

const PORT = Number(process.env.PORT) || 3001
const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function resolveClientOrigins() {
  const set = new Set(DEFAULT_CLIENT_ORIGINS)
  const extra = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  extra.forEach((o) => set.add(o))
  if (process.env.RAILWAY_STATIC_URL) {
    try {
      set.add(new URL(process.env.RAILWAY_STATIC_URL).origin)
    } catch {
      /* ignore */
    }
  }
  return [...set]
}

const CLIENT_ORIGINS = resolveClientOrigins()

const app = express()
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, players: players.size })
})

const serveStatic =
  process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1'

if (serveStatic) {
  if (fs.existsSync(CLIENT_DIST)) {
    // catch-all 없음: /socket.io 폴링이 Express에 먹히면 소켓이 깨질 수 있음.
    // 이 앱은 클라이언트 라우트가 / 뿐이라 static만으로 충분(index.html 자동 제공).
    app.use(express.static(CLIENT_DIST))
  } else {
    console.warn('[server] client/dist 없음 — 배포 전에 client에서 npm run build 실행')
  }
}

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

/** @type {Map<string, { nickname: string; level: number }>} */
const players = new Map()

function sanitizeNickname(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (s.length > 14) return s.slice(0, 14)
  return s
}

function buildUserList() {
  return [...players.entries()].map(([id, p]) => ({
    id,
    nickname: p.nickname,
  }))
}

function buildRanking() {
  const rows = [...players.values()].map((p) => ({
    nickname: p.nickname,
    level: p.level,
  }))
  rows.sort((a, b) => b.level - a.level || a.nickname.localeCompare(b.nickname))
  return rows.map((row, i) => ({ rank: i + 1, ...row }))
}

function broadcastRanking() {
  io.emit('ranking:update', buildRanking())
}

function broadcastUsers() {
  io.emit('users:update', buildUserList())
}

io.on('connection', (socket) => {
  socket.on('player:join', (payload, ack) => {
    const nickname = sanitizeNickname(payload?.nickname)
    if (!nickname) {
      ack?.({ ok: false, message: '닉네임을 입력해 주세요.' })
      return
    }

    players.set(socket.id, { nickname, level: 0 })
    socket.data.nickname = nickname
    socket.data.level = 0

    broadcastUsers()
    broadcastRanking()

    const rates = getRatesForLevel(0)
    ack?.({
      ok: true,
      nickname,
      level: 0,
      ratesPreview: rates,
    })

    io.emit('chat:system', {
      ts: Date.now(),
      message: `${nickname} 님이 세계에 접속했습니다.`,
    })
  })

  socket.on('chat:send', (payload) => {
    const p = players.get(socket.id)
    if (!p) return
    const text = String(payload?.text ?? '').trim()
    if (!text || text.length > 200) return
    io.emit('chat:message', {
      ts: Date.now(),
      nickname: p.nickname,
      text,
    })
  })

  socket.on('enhance:request', (_payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: '세션을 찾을 수 없습니다. 다시 접속해 주세요.' })
      return
    }

    const rolled = rollEnhance(p.level)
    if (!rolled.ok) {
      ack?.({ ok: false, message: rolled.message })
      return
    }

    p.level = rolled.newLevel
    socket.data.level = rolled.newLevel

    const payload = {
      ok: true,
      outcome: rolled.outcome,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
      rates: rolled.rates,
      nextRates: getRatesForLevel(rolled.newLevel),
    }

    ack?.(payload)

    io.emit('enhance:broadcast', {
      ts: Date.now(),
      nickname: p.nickname,
      outcome: rolled.outcome,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
    })

    broadcastRanking()
  })

  socket.on('disconnect', () => {
    const p = players.get(socket.id)
    players.delete(socket.id)
    if (p) {
      broadcastUsers()
      broadcastRanking()
      io.emit('chat:system', {
        ts: Date.now(),
        message: `${p.nickname} 님이 퇴장했습니다.`,
      })
    }
  })
})

server.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
  console.log(`[server] CORS origins: ${CLIENT_ORIGINS.join(', ')}`)
  if (serveStatic && fs.existsSync(CLIENT_DIST)) {
    console.log('[server] serving client/dist (프로덕션 모드)')
  }
})
