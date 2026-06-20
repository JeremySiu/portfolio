import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import { AnimatePresence, motion } from 'framer-motion'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

const MAX_BOARD_PX = 480

type Color = 'w' | 'b'

// Persists game state across component unmounts (minimize / close sheet).
// Lives at module scope so it survives for the lifetime of the page.
// `started` is false until the player has picked a side for the current game,
// so reopening the app mid-game does not re-prompt for a color.
//
// We store the full move list (UCI strings) rather than just a FEN so that
// Chess instances can be rebuilt with complete position history — which is
// required for chess.js's isThreefoldRepetition() to work correctly.
const savedGame: { moves: string[]; playerColor: Color; started: boolean } = {
  moves: [],
  playerColor: 'w',
  started: false,
}

// Replay a list of UCI moves onto a fresh Chess instance so it carries the
// full position history needed for threefold-repetition detection.
function buildGame(moves: string[]): Chess {
  const g = new Chess()
  for (const uci of moves) {
    g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
  }
  return g
}

// Bot thinking budget for the engine (book moves return near-instantly).
const BOT_TIME_LIMIT_MS = 1200
// Small delay before the bot moves so quick replies feel human, not jarring.
const BOT_MOVE_DELAY_MS = 300

// Board palette matching the classic green/cream chess board
const LIGHT_SQUARE = '#eeeed2'
const DARK_SQUARE = '#769656'
const SELECTED_LIGHT = 'rgba(246,246,105,0.7)'
const SELECTED_DARK = 'rgba(186,202,68,0.85)'
const MOVE_DOT_EMPTY = 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 28%)'
const MOVE_DOT_EMPTY_DARK = 'radial-gradient(circle, rgba(0,0,0,0.22) 28%, transparent 28%)'
const CAPTURE_RING = 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.2) 60%)'
const CAPTURE_RING_DARK = 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.26) 60%)'

interface BotMessage {
  type: 'move'
  move: string | null
  source?: 'book' | 'engine'
  id?: number
}

function gameStatus(game: Chess, playerColor: Color): string {
  if (game.isCheckmate()) {
    const loser = game.turn()
    return loser === playerColor ? 'Checkmate, the bot wins. Good Game!' : 'Checkmate, you win!'
  }
  if (game.isStalemate()) return 'Stalemate, draw'
  if (game.isDraw()) return 'Draw'
  const yourTurn = game.turn() === playerColor
  const base = yourTurn ? 'Your move' : "Bot's move"
  return game.isCheck() ? `${base}, check!` : base
}

type GameResult = { outcome: 'win' | 'loss' | 'draw'; headline: string; sub: string }

function getGameResult(game: Chess, playerColor: Color): GameResult | null {
  if (!game.isGameOver()) return null
  if (game.isCheckmate()) {
    const loser = game.turn()
    if (loser === playerColor) {
      return { outcome: 'loss', headline: 'You Lost', sub: 'Checkmate, the bot wins. Good game!' }
    }
    return { outcome: 'win', headline: 'You Won!', sub: 'Checkmate, well played!' }
  }
  if (game.isStalemate()) return { outcome: 'draw', headline: 'Stalemate', sub: 'No legal moves.' }
  if (game.isInsufficientMaterial()) {
    return { outcome: 'draw', headline: 'Draw', sub: 'Insufficient material to checkmate.' }
  }
  if (game.isThreefoldRepetition()) {
    return { outcome: 'draw', headline: 'Draw', sub: 'Threefold repetition.' }
  }
  return { outcome: 'draw', headline: 'Draw', sub: "It's a draw." }
}

function isLightSquare(sq: string): boolean {
  const col = sq.charCodeAt(0) - 'a'.charCodeAt(0)
  const row = parseInt(sq[1]) - 1
  return (col + row) % 2 !== 0
}

// ── Evaluation bar ────────────────────────────────────────────────────────────

function EvalBar({
  winChance,
  evalStr,
  loading,
  height,
  light,
  visible,
  onToggle,
}: {
  winChance: number
  evalStr: string
  loading: boolean
  height: number
  light: boolean
  visible: boolean
  onToggle: () => void
}) {
  const pct = Math.max(0, Math.min(100, winChance))

  const toggleBtn = (
    <button
      type="button"
      onClick={onToggle}
      title={visible ? 'Hide evaluation' : 'Show evaluation'}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        opacity: visible ? 0.55 : 0.35,
        transition: 'opacity 0.15s',
        flexShrink: 0,
      }}
    >
      {visible ? '👁' : '👁'}
    </button>
  )

  if (!visible) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height,
          flexShrink: 0,
          paddingBottom: 2,
        }}
      >
        {toggleBtn}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
      }}
    >
      {/* Bar */}
      <div
        style={{
          width: 14,
          height,
          position: 'relative',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#1c1c1c',
        }}
      >
        {/* White section grows from bottom */}
        <motion.div
          animate={{ height: `${pct}%` }}
          initial={{ height: '50%' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: LIGHT_SQUARE,
          }}
        />
        {/* 50% midline */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(120,120,120,0.4)',
            transform: 'translateY(-50%)',
          }}
        />
      </div>

      {/* Eval label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: loading
            ? light ? '#bbb' : '#555'
            : light ? '#333' : '#ccc',
          fontFamily: 'monospace',
          letterSpacing: '-0.01em',
          minWidth: 32,
          textAlign: 'center',
          transition: 'color 0.2s',
        }}
      >
        {loading ? '…' : evalStr}
      </span>

      {/* Toggle */}
      {toggleBtn}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChessApp() {
  const surface = useContext(AppSurfaceContext)
  const light = surface === 'light'
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(360)
  const [game, setGame] = useState(() => buildGame(savedGame.moves))
  const [fen, setFen] = useState(() => buildGame(savedGame.moves).fen())
  const [playerColor, setPlayerColor] = useState<Color>(() => savedGame.playerColor)
  const [botThinking, setBotThinking] = useState(false)
  // True while the player is being asked which side to play (start of each game).
  const [choosingSide, setChoosingSide] = useState(() => !savedGame.started)
  const [modalDismissed, setModalDismissed] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalTargets, setLegalTargets] = useState<Set<string>>(new Set())
  const [captureTargets, setCaptureTargets] = useState<Set<string>>(new Set())

  // ── Evaluation (chess-api.com) ───────────────────────────────────────────────
  const [evalWinChance, setEvalWinChance] = useState(50)
  const [evalDisplay, setEvalDisplay] = useState('0.0')
  const [evalLoading, setEvalLoading] = useState(false)
  const [showEvalBar, setShowEvalBar] = useState(true)

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const lastRequestedFenRef = useRef<string | null>(null)

  const titleColor = light ? '#1a1a1a' : '#f0eed8'
  const isGameOver = game.isGameOver()
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'
  const isPlayerTurn = !isGameOver && !choosingSide && game.turn() === playerColor && !botThinking

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateWidth = () =>
      setBoardWidth(Math.min(MAX_BOARD_PX, Math.max(260, el.clientWidth - 32)))
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Spin up the bot worker on mount and tear it down on unmount.
  useEffect(() => {
    const worker = new Worker(new URL('../../workers/chessBotWorker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as BotMessage
      if (!data || data.type !== 'move') return
      if (data.id !== requestIdRef.current) return
      setBotThinking(false)
      if (!data.move) return
      const next = buildGame(savedGame.moves)
      try {
        const from = data.move.slice(0, 2)
        const to = data.move.slice(2, 4)
        const promotion = (data.move.length > 4 ? data.move[4] : 'q') as 'q' | 'r' | 'b' | 'n'
        const mv = next.move({ from, to, promotion })
        if (!mv) return
        savedGame.moves.push(mv.from + mv.to + (mv.promotion ?? ''))
        setGame(next)
        setFen(next.fen())
      } catch {
        // Stale or illegal move — ignore.
      }
    }
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Ask the bot to move whenever it is its turn.
  useEffect(() => {
    if (isGameOver || choosingSide) return
    const turn = fen.split(' ')[1]
    if (turn !== botColor) return
    if (lastRequestedFenRef.current === fen) return

    lastRequestedFenRef.current = fen
    const id = requestIdRef.current + 1
    requestIdRef.current = id
    setBotThinking(true)
    const t = setTimeout(() => {
      workerRef.current?.postMessage({
        type: 'getMove',
        fen,
        timeLimitMs: BOT_TIME_LIMIT_MS,
        id,
      })
    }, BOT_MOVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [fen, botColor, isGameOver, choosingSide])

  // ── chess-api.com evaluation ──────────────────────────────────────────────────
  // Fires after every move (FEN change) once a side has been chosen.
  useEffect(() => {
    if (choosingSide || isGameOver) return
    const ctrl = new AbortController()
    setEvalLoading(true)

    fetch('https://chess-api.com/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen, depth: 12 }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (ctrl.signal.aborted) return

        const wc = typeof data.winChance === 'number' ? data.winChance : 50
        const ev = typeof data.eval === 'number' ? data.eval : 0
        const mate = data.mate as number | null | undefined

        let dispStr: string
        if (mate !== null && mate !== undefined) {
          dispStr = mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
        } else {
          dispStr = `${ev >= 0 ? '+' : ''}${ev.toFixed(1)}`
        }

        setEvalWinChance(wc)
        setEvalDisplay(dispStr)
        setEvalLoading(false)
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setEvalLoading(false)
      })

    return () => ctrl.abort()
  }, [fen, choosingSide, isGameOver])

  // Lock the eval bar to the definitive result when the game ends.
  useEffect(() => {
    if (!isGameOver || choosingSide) return
    setEvalLoading(false)
    if (game.isCheckmate()) {
      // game.turn() is the side that just got checkmated (they have no legal move)
      const winner = game.turn() === 'w' ? 'b' : 'w'
      setEvalWinChance(winner === 'w' ? 100 : 0)
      setEvalDisplay(winner === 'w' ? '1-0' : '0-1')
    } else {
      setEvalWinChance(50)
      setEvalDisplay('½-½')
    }
  }, [isGameOver, choosingSide, game])

  // ── Move / selection helpers ──────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setLegalTargets(new Set())
    setCaptureTargets(new Set())
  }, [])

  const selectSquare = useCallback(
    (square: string, currentGame: Chess) => {
      const moves = currentGame.moves({ square: square as Parameters<Chess['moves']>[0] extends { square?: infer S } ? S : never, verbose: true })
      if (!moves.length) {
        clearSelection()
        return
      }
      const targets = new Set<string>()
      const captures = new Set<string>()
      for (const m of moves) {
        if (m.flags.includes('c') || m.flags.includes('e')) {
          captures.add(m.to)
        } else {
          targets.add(m.to)
        }
      }
      setSelectedSquare(square)
      setLegalTargets(targets)
      setCaptureTargets(captures)
    },
    [clearSelection],
  )

  const tryMove = useCallback(
    (from: string, to: string, _currentGame: Chess): boolean => {
      const next = buildGame(savedGame.moves)
      try {
        const move = next.move({ from, to, promotion: 'q' })
        if (!move) return false
        savedGame.moves.push(move.from + move.to + (move.promotion ?? ''))
        setGame(next)
        setFen(next.fen())
        clearSelection()
        return true
      } catch {
        return false
      }
    },
    [clearSelection],
  )

  const onSquareClick = useCallback(
    ({ piece, square }: SquareHandlerArgs) => {
      if (!isPlayerTurn) return

      if (selectedSquare && (legalTargets.has(square) || captureTargets.has(square))) {
        tryMove(selectedSquare, square, game)
        return
      }

      if (piece && piece.pieceType[0].toLowerCase() === playerColor) {
        selectSquare(square, game)
        return
      }

      clearSelection()
    },
    [game, isPlayerTurn, playerColor, selectedSquare, legalTargets, captureTargets, tryMove, selectSquare, clearSelection],
  )

  const onPieceClick = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (!isPlayerTurn || !square) return
      const boardPiece = game.get(square as Parameters<Chess['get']>[0])
      if (!boardPiece || boardPiece.color !== playerColor) return
      selectSquare(square, game)
    },
    [game, isPlayerTurn, playerColor, selectSquare],
  )

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || !isPlayerTurn) return false
      return tryMove(sourceSquare, targetSquare, game)
    },
    [game, isPlayerTurn, tryMove],
  )

  // Start a brand-new game with the chosen side.
  const startFreshGame = useCallback(
    (color: Color) => {
      const fresh = new Chess()
      savedGame.moves = []
      savedGame.playerColor = color
      savedGame.started = true
      requestIdRef.current += 1
      lastRequestedFenRef.current = null
      setPlayerColor(color)
      setGame(fresh)
      setFen(fresh.fen())
      setBotThinking(false)
      setChoosingSide(false)
      setModalDismissed(false)
      setEvalWinChance(50)
      setEvalDisplay('0.0')
      clearSelection()
    },
    [clearSelection],
  )

  // Reset the board and prompt the player to choose a side for the new game.
  const newGame = useCallback(() => {
    const fresh = new Chess()
    savedGame.moves = []
    savedGame.started = false
    requestIdRef.current += 1
    lastRequestedFenRef.current = null
    setGame(fresh)
    setFen(fresh.fen())
    setBotThinking(false)
    clearSelection()
    setChoosingSide(true)
    setModalDismissed(false)
    setEvalWinChance(50)
    setEvalDisplay('0.0')
  }, [clearSelection])

  // ── Square highlight styles ───────────────────────────────────────────────────

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      background: isLightSquare(selectedSquare) ? SELECTED_LIGHT : SELECTED_DARK,
    }
  }
  for (const sq of legalTargets) {
    squareStyles[sq] = { background: isLightSquare(sq) ? MOVE_DOT_EMPTY : MOVE_DOT_EMPTY_DARK }
  }
  for (const sq of captureTargets) {
    squareStyles[sq] = { background: isLightSquare(sq) ? CAPTURE_RING : CAPTURE_RING_DARK }
  }

  const status = choosingSide
    ? 'Pick a side to begin'
    : botThinking
      ? 'Bot is thinking…'
      : gameStatus(game, playerColor)
  const isCheck = !choosingSide && !botThinking && !isGameOver && game.isCheck()
  const gameResult = getGameResult(game, playerColor)

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Banner */}
      <div
        style={{
          width: '100%',
          padding: '20px 24px 18px',
          background: DARK_SQUARE,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: '#ffffff',
            lineHeight: 1.1,
          }}
        >
          Chess Bot
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
            textAlign: 'center',
          }}
        >
          Hiarcs opening book, then minimax algorithm with alpha-beta pruning and quiescence search
        </div>
      </div>

      {/* Side picker */}
      {choosingSide && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '16px 16px 0',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>
            Choose your side
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {(['w', 'b'] as Color[]).map((c) => (
              <motion.button
                key={c}
                type="button"
                onClick={() => startFreshGame(c)}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '9px 22px',
                  borderRadius: 8,
                  border: `2px solid ${DARK_SQUARE}`,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  background: 'transparent',
                  color: light ? DARK_SQUARE : LIGHT_SQUARE,
                }}
              >
                {c === 'w' ? 'Play as White' : 'Play as Black'}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Board row: eval bar + board + game-over overlay */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 16px 0',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Evaluation bar (hidden while choosing side) */}
          {!choosingSide && (
            <EvalBar
              winChance={evalWinChance}
              evalStr={evalDisplay}
              loading={evalLoading}
              height={boardWidth}
              light={light}
              visible={showEvalBar}
              onToggle={() => setShowEvalBar((v) => !v)}
            />
          )}

          {/* Board + game-over overlay */}
          <div style={{ position: 'relative', flexShrink: 0, width: boardWidth, height: boardWidth }}>
            {/* Board — dims when game is over */}
            <motion.div
              animate={{ opacity: isGameOver ? 0.38 : 1 }}
              transition={{ duration: 0.5 }}
            >
              <Chessboard
                options={{
                  position: fen,
                  boardOrientation: playerColor === 'w' ? 'white' : 'black',
                  allowDragging: isPlayerTurn,
                  onPieceDrop,
                  onSquareClick,
                  onPieceClick,
                  squareStyles,
                  boardStyle: {
                    width: boardWidth,
                    borderRadius: 4,
                    boxShadow: light
                      ? '0 6px 32px rgba(0,0,0,0.18)'
                      : '0 8px 40px rgba(0,0,0,0.55)',
                  },
                  lightSquareStyle: { backgroundColor: LIGHT_SQUARE },
                  darkSquareStyle: { backgroundColor: DARK_SQUARE },
                }}
              />
            </motion.div>

            {/* Flexbox overlay — centers the modal card over the board */}
            <AnimatePresence>
              {gameResult && !modalDismissed && (
                <motion.div
                  key="game-over-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.88 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.88 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      padding: '28px 36px 24px',
                      borderRadius: 14,
                      background: light
                        ? 'rgba(255,255,255,0.96)'
                        : 'rgba(28,28,28,0.96)',
                      boxShadow: '0 12px 48px rgba(0,0,0,0.38)',
                      backdropFilter: 'blur(6px)',
                      textAlign: 'center',
                      minWidth: 210,
                    }}
                  >
                    {/* Dismiss button */}
                    <button
                      type="button"
                      onClick={() => setModalDismissed(true)}
                      aria-label="Close"
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = light ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)')}
                    >
                      ✕
                    </button>

                    {/* Icon */}
                    <div style={{ fontSize: 38, lineHeight: 1 }}>
                      {gameResult.outcome === 'win' ? '💪' : gameResult.outcome === 'loss' ? '😢' : '🤝'}
                    </div>

                    {/* Headline */}
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color:
                          gameResult.outcome === 'win'
                            ? '#2e7d32'
                            : gameResult.outcome === 'loss'
                              ? '#c62828'
                              : light ? '#5a4a00' : '#f5d060',
                      }}
                    >
                      {gameResult.headline}
                    </div>

                    {/* Subtext */}
                    <div
                      style={{
                        fontSize: 13,
                        color: light ? '#555' : 'rgba(255,255,255,0.65)',
                        maxWidth: 200,
                        lineHeight: 1.45,
                      }}
                    >
                      {gameResult.sub}
                    </div>

                    {/* New Game button */}
                    <motion.button
                      type="button"
                      onClick={newGame}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        marginTop: 4,
                        padding: '10px 28px',
                        borderRadius: 8,
                        border: `2px solid ${DARK_SQUARE}`,
                        cursor: 'pointer',
                        color: light ? DARK_SQUARE : LIGHT_SQUARE,
                        fontWeight: 700,
                        fontSize: 14,
                        background: 'transparent',
                        letterSpacing: '0.01em',
                      }}
                    >
                      New Game
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Status + controls */}
      <div
        style={{
          width: '100%',
          padding: '14px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 22 }}>
          {botThinking && (
            <motion.span
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${DARK_SQUARE}`,
                borderTopColor: 'transparent',
                display: 'inline-block',
              }}
            />
          )}
          <p
            style={{
              margin: 0,
              color: isCheck ? '#c62828' : titleColor,
              fontSize: 15,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {status}
          </p>
        </div>

        {!isGameOver && (
          <motion.button
            type="button"
            onClick={newGame}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '11px 32px',
              borderRadius: 8,
              border: `2px solid ${DARK_SQUARE}`,
              cursor: 'pointer',
              color: light ? DARK_SQUARE : LIGHT_SQUARE,
              fontWeight: 700,
              fontSize: 14,
              background: 'transparent',
              letterSpacing: '0.01em',
            }}
          >
            New Game
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
