import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { DEFAULT_RATE_TIERS, getRatesForLevel, normalizeRateTiers, rollEnhance } from './enhanceEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist')
const DATA_DIR = path.join(__dirname, 'data')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')
const RATES_FILE = path.join(DATA_DIR, 'rates.json')

const PORT = Number(process.env.PORT) || 3001
const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123')
const STARTING_GOLD = 500_000

const RARITY = {
  common: { label: 'Common', multiplier: 1, color: '#cbd5e1' },
  rare: { label: 'Rare', multiplier: 1.25, color: '#7dd3fc' },
  epic: { label: 'Epic', multiplier: 1.6, color: '#d946ef' },
  legendary: { label: 'Legendary', multiplier: 2.2, color: '#f59e0b' },
}

const WEAPON_CATALOG = {
  training_sword: { name: 'Training Sword', type: 'Sword', rarity: 'common', basePrice: 0 },
  iron_greatsword: { name: 'Iron Greatsword', type: 'Greatsword', rarity: 'common', basePrice: 180_000 },
  azure_spear: { name: 'Azure Spear', type: 'Spear', rarity: 'rare', basePrice: 450_000 },
  storm_bow: { name: 'Storm Bow', type: 'Bow', rarity: 'rare', basePrice: 620_000 },
  ember_axe: { name: 'Ember Axe', type: 'Axe', rarity: 'epic', basePrice: 1_350_000 },
  arcane_staff: { name: 'Arcane Staff', type: 'Staff', rarity: 'epic', basePrice: 1_650_000 },
  dragon_blade: { name: 'Dragon Blade', type: 'Blade', rarity: 'legendary', basePrice: 3_800_000 },
}

const SHOP_ITEMS = [
  { id: 'iron-greatsword', catalogId: 'iron_greatsword', level: 0, price: 180_000 },
  { id: 'azure-spear-4', catalogId: 'azure_spear', level: 4, price: 780_000 },
  { id: 'storm-bow-8', catalogId: 'storm_bow', level: 8, price: 1_500_000 },
  { id: 'ember-axe-8', catalogId: 'ember_axe', level: 8, price: 2_200_000 },
  { id: 'arcane-staff-10', catalogId: 'arcane_staff', level: 10, price: 3_200_000 },
  { id: 'dragon-blade-12', catalogId: 'dragon_blade', level: 12, price: 5_800_000 },
  { id: 'protection-scroll-1', kind: 'protection', name: 'Protection Scroll', quantity: 1, price: 600_000 },
  { id: 'protection-scroll-5', kind: 'protection', name: 'Protection Scroll x5', quantity: 5, price: 2_700_000 },
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

function createWeapon(catalogId = 'training_sword', level = 0) {
  const template = WEAPON_CATALOG[catalogId] || WEAPON_CATALOG.training_sword
  return {
    uid: `${catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    catalogId,
    name: template.name,
    type: template.type,
    rarity: template.rarity,
    level: Math.max(0, Math.min(30, Number(level) || 0)),
  }
}

function cloneWeapon(weapon) {
  return { ...weapon }
}

function getRarityMeta(rarity) {
  return RARITY[rarity] || RARITY.common
}

function getEnhanceCost(weapon) {
  const meta = getRarityMeta(weapon?.rarity)
  const level = Math.max(0, Number(weapon?.level) || 0)
  return Math.round((25_000 + level * level * 9_500 + level * 35_000) * meta.multiplier)
}

function getSellValue(weapon) {
  const meta = getRarityMeta(weapon?.rarity)
  const level = Math.max(0, Number(weapon?.level) || 0)
  const base = WEAPON_CATALOG[weapon?.catalogId]?.basePrice || 20_000
  return Math.round((base * 0.45 + level * level * 20_000) * meta.multiplier)
}

function normalizeWeapon(raw) {
  const catalogId = raw?.catalogId || raw?.id || 'training_sword'
  const template = WEAPON_CATALOG[catalogId] || WEAPON_CATALOG.training_sword
  return {
    uid: String(raw?.uid || `${catalogId}-${Math.random().toString(36).slice(2, 10)}`),
    catalogId,
    name: String(raw?.name || template.name),
    type: String(raw?.type || template.type),
    rarity: String(raw?.rarity || template.rarity),
    level: Math.max(0, Math.min(30, Number(raw?.level) || 0)),
  }
}

function normalizeProfile(raw, nickname) {
  const legacyWeapon = raw?.weapon ? normalizeWeapon(raw.weapon) : null
  const weapons = Array.isArray(raw?.weapons)
    ? raw.weapons.map(normalizeWeapon)
    : legacyWeapon
      ? [legacyWeapon]
      : [createWeapon('training_sword', 0)]
  if (!weapons.length) weapons.push(createWeapon('training_sword', 0))
  const activeWeaponId =
    weapons.find((weapon) => weapon.uid === raw?.activeWeaponId)?.uid || weapons[0].uid

  return {
    nickname,
    gold: raw ? Math.max(0, Number(raw.gold) || 0) : STARTING_GOLD,
    protectionScrolls: Math.max(0, Number(raw?.protectionScrolls) || 0),
    activeWeaponId,
    weapons,
  }
}

function getActiveWeapon(player) {
  return player.weapons.find((weapon) => weapon.uid === player.activeWeaponId) || player.weapons[0]
}

function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return new Map()
    const parsed = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'))
    return new Map(
      Object.entries(parsed).map(([nickname, profile]) => [
        nickname,
        normalizeProfile(profile, nickname),
      ]),
    )
  } catch (err) {
    console.warn('[server] failed to load profiles:', err.message)
    return new Map()
  }
}

function saveProfiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const payload = Object.fromEntries(
    [...profiles.entries()].map(([nickname, profile]) => [
      nickname,
      {
        gold: profile.gold,
        protectionScrolls: profile.protectionScrolls,
        activeWeaponId: profile.activeWeaponId,
        weapons: profile.weapons.map(cloneWeapon),
      },
    ]),
  )
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(payload, null, 2))
}

function saveProfile(player) {
  profiles.set(player.nickname, {
    nickname: player.nickname,
    gold: player.gold,
    protectionScrolls: player.protectionScrolls,
    activeWeaponId: player.activeWeaponId,
    weapons: player.weapons.map(cloneWeapon),
  })
  saveProfiles()
}

function loadRateTiers() {
  try {
    if (!fs.existsSync(RATES_FILE)) return DEFAULT_RATE_TIERS
    const parsed = JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'))
    return normalizeRateTiers(parsed?.tiers)
  } catch (err) {
    console.warn('[server] failed to load rates:', err.message)
    return DEFAULT_RATE_TIERS
  }
}

function saveRateTiers(nextRateTiers) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(
    RATES_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), tiers: nextRateTiers }, null, 2),
  )
}

function getPriceTable(activeWeapon) {
  return Array.from({ length: 16 }, (_, level) => ({
    level,
    sellValue: getSellValue({ ...activeWeapon, level }),
    enhanceCost: level >= 30 ? null : getEnhanceCost({ ...activeWeapon, level }),
  }))
}

function buildPlayerState(player) {
  const activeWeapon = getActiveWeapon(player)
  return {
    gold: player.gold,
    protectionScrolls: player.protectionScrolls,
    activeWeaponId: activeWeapon.uid,
    weapon: cloneWeapon(activeWeapon),
    inventory: player.weapons.map(cloneWeapon),
    rarityMeta: RARITY,
    shopItems: SHOP_ITEMS.map((item) => {
      if (item.kind === 'protection') return item
      const template = WEAPON_CATALOG[item.catalogId]
      return { ...item, ...template, rarityMeta: getRarityMeta(template.rarity) }
    }),
    enhanceCost: getEnhanceCost(activeWeapon),
    sellValue: getSellValue(activeWeapon),
    priceTable: getPriceTable(activeWeapon),
  }
}

function isAdminRequest(req) {
  if (!ADMIN_PASSWORD) return false
  return req.get('x-admin-password') === ADMIN_PASSWORD
}

const CLIENT_ORIGINS = resolveClientOrigins()

const app = express()
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }))
app.use(express.json())

const server = http.createServer(app)
const players = new Map()
const profiles = loadProfiles()
let rateTiers = loadRateTiers()

app.get('/health', (_req, res) => {
  res.json({ ok: true, players: players.size, profiles: profiles.size, adminEnabled: Boolean(ADMIN_PASSWORD) })
})

app.get('/api/rates', (_req, res) => {
  res.json({
    ok: true,
    tiers: rateTiers.map((tier) => ({ ...tier, fail: 100 - tier.success - tier.destroy })),
  })
})

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    res.status(403).json({ ok: false, message: 'Admin mode is disabled. Set ADMIN_PASSWORD on the server.' })
    return
  }
  if (req.body?.password !== ADMIN_PASSWORD) {
    res.status(401).json({ ok: false, message: 'Wrong admin password.' })
    return
  }
  res.json({ ok: true })
})

app.put('/api/admin/rates', (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ ok: false, message: 'Admin password required.' })
    return
  }
  rateTiers = normalizeRateTiers(req.body?.tiers)
  saveRateTiers(rateTiers)
  io.emit('chat:system', { ts: Date.now(), message: 'Enhancement rates were updated by the admin.' })
  for (const socket of io.sockets.sockets.values()) {
    const player = players.get(socket.id)
    if (player) socket.emit('rates:update', getRatesForLevel(getActiveWeapon(player).level, rateTiers))
  }
  res.json({
    ok: true,
    tiers: rateTiers.map((tier) => ({ ...tier, fail: 100 - tier.success - tier.destroy })),
  })
})

const serveStatic = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1'

if (serveStatic) {
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST))
    app.get('/admin', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))
  } else {
    console.warn('[server] client/dist not found. Run npm run build:client before deployment.')
  }
}

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'], credentials: true },
})

function sanitizeNickname(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return s.length > 14 ? s.slice(0, 14) : s
}

function buildUserList() {
  return [...players.entries()].map(([id, p]) => ({ id, nickname: p.nickname }))
}

function buildRanking() {
  const activeNicknames = new Set([...players.values()].map((p) => p.nickname))
  const rows = [...profiles.values()].map((p) => {
    const weapon = getActiveWeapon(p)
    return {
      nickname: p.nickname,
      level: weapon.level,
      weaponName: weapon.name,
      rarity: weapon.rarity,
      gold: p.gold,
      online: activeNicknames.has(p.nickname),
    }
  })
  rows.sort((a, b) => b.level - a.level || b.gold - a.gold || a.nickname.localeCompare(b.nickname))
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
      ack?.({ ok: false, message: 'Enter a nickname.' })
      return
    }

    const player = normalizeProfile(profiles.get(nickname), nickname)
    players.set(socket.id, player)
    saveProfile(player)
    socket.data.nickname = nickname

    const activeWeapon = getActiveWeapon(player)
    broadcastUsers()
    broadcastRanking()
    ack?.({
      ok: true,
      nickname,
      level: activeWeapon.level,
      ratesPreview: getRatesForLevel(activeWeapon.level, rateTiers),
      state: buildPlayerState(player),
    })
    io.emit('chat:system', { ts: Date.now(), message: `${nickname} joined the arena.` })
  })

  socket.on('chat:send', (payload) => {
    const p = players.get(socket.id)
    if (!p) return
    const text = String(payload?.text ?? '').trim()
    if (!text || text.length > 200) return
    io.emit('chat:message', { ts: Date.now(), nickname: p.nickname, text })
  })

  socket.on('enhance:request', (payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: 'Session not found. Please reconnect.' })
      return
    }

    const weapon = getActiveWeapon(p)
    if (weapon.level >= 30) {
      ack?.({ ok: false, message: 'Already at max enhancement level.' })
      return
    }
    const cost = getEnhanceCost(weapon)
    if (p.gold < cost) {
      ack?.({ ok: false, message: `Not enough gold. Need ${cost.toLocaleString('ko-KR')} gold.` })
      return
    }

    p.gold -= cost
    const useProtection = Boolean(payload?.useProtection) && p.protectionScrolls > 0
    const rolled = rollEnhance(weapon.level, rateTiers)
    let protectedDestroy = false

    if (rolled.outcome === 'destroy' && useProtection) {
      p.protectionScrolls -= 1
      protectedDestroy = true
      rolled.outcome = 'protected'
      rolled.newLevel = rolled.oldLevel
    }

    weapon.level = rolled.newLevel
    saveProfile(p)

    ack?.({
      ok: true,
      outcome: rolled.outcome,
      protectedDestroy,
      cost,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
      rates: rolled.rates,
      nextRates: getRatesForLevel(rolled.newLevel, rateTiers),
      state: buildPlayerState(p),
    })

    io.emit('enhance:broadcast', {
      ts: Date.now(),
      nickname: p.nickname,
      weaponName: weapon.name,
      outcome: rolled.outcome,
      oldLevel: rolled.oldLevel,
      newLevel: rolled.newLevel,
    })
    broadcastRanking()
  })

  socket.on('weapon:equip', (payload, ack) => {
    const p = players.get(socket.id)
    const weapon = p?.weapons.find((entry) => entry.uid === payload?.weaponId)
    if (!p || !weapon) {
      ack?.({ ok: false, message: 'Weapon not found.' })
      return
    }
    p.activeWeaponId = weapon.uid
    saveProfile(p)
    ack?.({
      ok: true,
      level: weapon.level,
      ratesPreview: getRatesForLevel(weapon.level, rateTiers),
      state: buildPlayerState(p),
    })
    broadcastRanking()
  })

  socket.on('weapon:sell', (payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: 'Session not found. Please reconnect.' })
      return
    }
    if (p.weapons.length <= 1) {
      ack?.({ ok: false, message: 'You need at least one weapon.' })
      return
    }
    const weaponId = payload?.weaponId || p.activeWeaponId
    const soldWeapon = p.weapons.find((weapon) => weapon.uid === weaponId)
    if (!soldWeapon) {
      ack?.({ ok: false, message: 'Weapon not found.' })
      return
    }

    const earned = getSellValue(soldWeapon)
    p.gold += earned
    p.weapons = p.weapons.filter((weapon) => weapon.uid !== soldWeapon.uid)
    if (p.activeWeaponId === soldWeapon.uid) p.activeWeaponId = p.weapons[0].uid
    const activeWeapon = getActiveWeapon(p)
    saveProfile(p)

    ack?.({
      ok: true,
      earned,
      soldWeapon,
      level: activeWeapon.level,
      ratesPreview: getRatesForLevel(activeWeapon.level, rateTiers),
      state: buildPlayerState(p),
    })
    io.emit('chat:system', {
      ts: Date.now(),
      message: `${p.nickname} sold +${soldWeapon.level} ${soldWeapon.name} for ${earned.toLocaleString('ko-KR')} gold.`,
    })
    broadcastRanking()
  })

  socket.on('shop:buy', (payload, ack) => {
    const p = players.get(socket.id)
    if (!p) {
      ack?.({ ok: false, message: 'Session not found. Please reconnect.' })
      return
    }
    const item = SHOP_ITEMS.find((entry) => entry.id === payload?.itemId)
    if (!item) {
      ack?.({ ok: false, message: 'Shop item not found.' })
      return
    }
    if (p.gold < item.price) {
      ack?.({ ok: false, message: 'Not enough gold.' })
      return
    }

    p.gold -= item.price
    if (item.kind === 'protection') {
      p.protectionScrolls += item.quantity
    } else {
      const weapon = createWeapon(item.catalogId, item.level)
      p.weapons.push(weapon)
      p.activeWeaponId = weapon.uid
    }
    const activeWeapon = getActiveWeapon(p)
    saveProfile(p)

    ack?.({
      ok: true,
      boughtItem: item,
      level: activeWeapon.level,
      ratesPreview: getRatesForLevel(activeWeapon.level, rateTiers),
      state: buildPlayerState(p),
    })
    io.emit('chat:system', {
      ts: Date.now(),
      message: `${p.nickname} bought ${item.name || WEAPON_CATALOG[item.catalogId]?.name}.`,
    })
    broadcastRanking()
  })

  socket.on('disconnect', () => {
    const p = players.get(socket.id)
    players.delete(socket.id)
    if (p) {
      saveProfile(p)
      broadcastUsers()
      broadcastRanking()
      io.emit('chat:system', { ts: Date.now(), message: `${p.nickname} left the arena.` })
    }
  })
})

server.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
  console.log(`[server] CORS origins: ${CLIENT_ORIGINS.join(', ')}`)
  console.log(`[server] loaded profiles: ${profiles.size}`)
  console.log(`[server] admin mode: ${ADMIN_PASSWORD ? 'enabled' : 'disabled'}`)
  if (serveStatic && fs.existsSync(CLIENT_DIST)) console.log('[server] serving client/dist')
})
