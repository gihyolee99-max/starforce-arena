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

const STARTER_WEAPON = { id: 'starter-sword', name: '수련용 검', level: 0 }
const SHOP_ITEMS = [
  { id: 'flame-katana-8', name: '홍련도', level: 8, price: 1_500_000 },
  { id: 'moon-spear-8', name: '월광창', level: 8, price: 1_500_000 },
  { id: 'storm-bow-8', name: '폭풍궁', level: 8, price: 1_500_000 },
  { id: 'dragon-blade-12', name: '용린검', level: 12, price: 3_800_000 },
]

function resolveClientOrigins() {
  const set = new Set(DEFAULT_CLIENT_ORIGINS)
  const extra = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  extra.forEach((origin) => set.add(origin))
  if (process.env.RAILWAY_STATIC_URL) {
    try {
      set.add(new URL(process.env.RAILWAY_STATIC_URL).origin)
    } catch {
      // Ignore invalid deployment URL values.
    }
  }
  return [...set]
}

function cloneWeapon(weapon = STARTER_WEAPON) {
  return { ...weapon }
}

function getSellValue(level) {
  const safeLevel = Math.max(0, Number(level) || 0)
  return safeLevel * safeLevel * 20_000
}

function buildPlayerState(player) {
  return {
    gold: player.gold,
    weapon: cloneWeapon(player.weapon),
    shopItems: SHOP_ITEMS,
    sellValue: getSellValue(player.weapon.level),
  }
}

const CLIENT_ORIGINS = resolveClientOrigins()

const app = express()
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }))
app.use(express.json())

const server = http.createServer(app)

/** @type {Map<string, { nickname: string; gold: number; weapon: { id: string; name: string; level: number } }>} */
const players = new Map()

app.get('/health', (_req, res) => {
  res.json({ ok: true, players: players.size })
})

const serveStatic = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1'

if (serveStatic) {
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST))
  } else {
    console.warn('[server] client/dist not found. Run npm run build:client before deployment.')
  }
}

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

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
    level: p.weapon.level,
    weaponName: p.weapon.name,
    gold: p.gold,
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

    const player = {
      nickname,
      gold: 0,
      weapon: cloneWeapon(STARTER_WEAPON),
    }
    players.set(socket.id, player)
    socket.data.nickname = nickname
    socket.data.level = player.weapon.level

    broadcastUsers()
    broadcastRanking()

    ack?.({
      ok: true,
      nickname,
      level: player.weapon.level,
      ratesPreview: getRatesForLevel(player.weapon.level),
      state: buildPlayerState(player),
    })

    io.emit('chat:system', {
      ts: Date.now(),
      message: `${nickname}님이 접속했습니다.`,
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

    const rolled = rollEnhance(p.weapon.level)
    if (!rolled.ok) {
      ack?.({ ok: false, message: rolled.message })
      return
    }

    p.weapon.level = rolled.newLevel
    socket.data.level = rolled.newLevel

    ack?.({
      ok: true,
      outcome: rolled.outcome,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
      rates: rolled.rates,
      nextRates: getRatesForLevel(rolled.newLevel),
      state: buildPlayerState(p),
    })

    io.emit('enhance:broadcast', {
      ts: Date.now(),
      nickname: p.nickname,
      weaponName: p.weapon.name,
      outcome: rolled.outcome,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
    })

    broadcastRanking()
  })

  socket.on('weapon:sell', (_payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: '세션을 찾을 수 없습니다. 다시 접속해 주세요.' })
      return
    }

    const soldWeapon = cloneWeapon(p.weapon)
    const earned = getSellValue(soldWeapon.level)
    if (earned <= 0) {
      ack?.({ ok: false, message: '+1 이상 강화한 무기부터 판매할 수 있습니다.' })
      return
    }

    p.gold += earned
    p.weapon = cloneWeapon(STARTER_WEAPON)
    socket.data.level = p.weapon.level

    ack?.({
      ok: true,
      earned,
      soldWeapon,
      level: p.weapon.level,
      ratesPreview: getRatesForLevel(p.weapon.level),
      state: buildPlayerState(p),
    })

    io.emit('chat:system', {
      ts: Date.now(),
      message: `${p.nickname}님이 +${soldWeapon.level} ${soldWeapon.name}을(를) 판매하고 ${earned.toLocaleString('ko-KR')}골드를 얻었습니다.`,
    })
    broadcastRanking()
  })

  socket.on('shop:buy', (payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: '세션을 찾을 수 없습니다. 다시 접속해 주세요.' })
      return
    }

    const item = SHOP_ITEMS.find((entry) => entry.id === payload?.itemId)
    if (!item) {
      ack?.({ ok: false, message: '상점 아이템을 찾을 수 없습니다.' })
      return
    }
    if (p.gold < item.price) {
      ack?.({ ok: false, message: '골드가 부족합니다.' })
      return
    }

    p.gold -= item.price
    p.weapon = { id: item.id, name: item.name, level: item.level }
    socket.data.level = p.weapon.level

    ack?.({
      ok: true,
      boughtItem: item,
      level: p.weapon.level,
      ratesPreview: getRatesForLevel(p.weapon.level),
      state: buildPlayerState(p),
    })

    io.emit('chat:system', {
      ts: Date.now(),
      message: `${p.nickname}님이 +${item.level} ${item.name}을(를) 구매했습니다.`,
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
        message: `${p.nickname}님이 퇴장했습니다.`,
      })
    }
  })
})

server.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
  console.log(`[server] CORS origins: ${CLIENT_ORIGINS.join(', ')}`)
  if (serveStatic && fs.existsSync(CLIENT_DIST)) {
    console.log('[server] serving client/dist')
  }
})
