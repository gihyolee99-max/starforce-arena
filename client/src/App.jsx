import { LoginScreen } from './components/LoginScreen.jsx'
import { GameShell } from './components/GameShell.jsx'
import { useEnhanceSession } from './hooks/useEnhanceSession.js'

export default function App() {
  const session = useEnhanceSession()

  if (session.phase === 'login' || session.phase === 'connecting') {
    return (
      <LoginScreen
        onStart={session.joinGame}
        busy={session.phase === 'connecting'}
        error={session.error}
      />
    )
  }

  return (
    <GameShell
      nickname={session.nickname}
      connected={session.connected}
      level={session.level}
      rates={session.rates}
      enhanceBusy={session.enhanceBusy}
      lastOutcome={session.lastOutcome}
      onEnhance={session.requestEnhance}
      onLeave={session.leaveGame}
      messages={session.messages}
      onSendChat={session.sendChat}
      ranking={session.ranking}
      users={session.users}
      socketId={session.socketId}
      feed={session.feed}
    />
  )
}
