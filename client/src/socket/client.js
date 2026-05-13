import { io } from 'socket.io-client'

export function getSocketServerUrl() {
  const fromEnv = import.meta.env.VITE_SOCKET_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  // 로컬 개발: Vite(5173) ↔ 서버(3001) 분리
  if (import.meta.env.DEV) return 'http://localhost:3001'
  // 프로덕션: 같은 주소에서 정적 파일+Socket.IO를 쓰는 경우 (배포 한 줄 URL)
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3001'
}

export function createGameSocket() {
  return io(getSocketServerUrl(), {
    autoConnect: false,
    // polling 먼저 시도: 일부 환경에서 ws만 먼저 쓰면 실패 로그가 남을 수 있음
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 600,
  })
}
