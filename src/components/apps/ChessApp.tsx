import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import { motion } from 'framer-motion'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'

const MAX_BOARD_PX = 480

// Persists game FEN across component unmounts (minimize / close sheet).
// Lives at module scope so it survives for the lifetime of the page.
const savedGame = { fen: new Chess().fen() }

// Board palette matching the classic green/cream chess board
const LIGHT_SQUARE = '#eeeed2'
const DARK_SQUARE = '#769656'
const SELECTED_LIGHT = 'rgba(246,246,105,0.7)'
const SELECTED_DARK = 'rgba(186,202,68,0.85)'
const MOVE_DOT_EMPTY = 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 28%)'
const MOVE_DOT_EMPTY_DARK = 'radial-gradient(circle, rgba(0,0,0,0.22) 28%, transparent 28%)'
const CAPTURE_RING = 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.2) 60%)'
const CAPTURE_RING_DARK = 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.26) 60%)'

function gameStatus(game: Chess): string {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? 'Checkmate — Black wins!' : 'Checkmate — White wins!'
  }
  if (game.isStalemate()) return 'Stalemate'
  if (game.isDraw()) return 'Draw'
  const side = game.turn() === 'w' ? 'White' : 'Black'
  return game.isCheck() ? `${side} to move  ✦  Check!` : `${side} to move`
}

function isLightSquare(sq: string): boolean {
  const col = sq.charCodeAt(0) - 'a'.charCodeAt(0)
  const row = parseInt(sq[1]) - 1
  return (col + row) % 2 !== 0
}

export default function ChessApp() {
  const surface = useContext(AppSurfaceContext)
  const light = surface === 'light'
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(360)
  const [game, setGame] = useState(() => new Chess(savedGame.fen))
  const [fen, setFen] = useState(() => savedGame.fen)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalTargets, setLegalTargets] = useState<Set<string>>(new Set())
  const [captureTargets, setCaptureTargets] = useState<Set<string>>(new Set())

  const titleColor = light ? '#1a1a1a' : '#f0eed8'
  const isGameOver = game.isGameOver()

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
    (from: string, to: string, currentGame: Chess): boolean => {
      const next = new Chess(currentGame.fen())
      try {
        const move = next.move({ from, to, promotion: 'q' })
        if (!move) return false
        savedGame.fen = next.fen()
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
      if (isGameOver) return

      // If clicking a legal target, execute the move
      if (selectedSquare && (legalTargets.has(square) || captureTargets.has(square))) {
        tryMove(selectedSquare, square, game)
        return
      }

      // If clicking an own piece, select it (even if already selected differently)
      const turn = game.turn()
      if (piece && piece.pieceType[0].toLowerCase() === turn) {
        selectSquare(square, game)
        return
      }

      clearSelection()
    },
    [game, isGameOver, selectedSquare, legalTargets, captureTargets, tryMove, selectSquare, clearSelection],
  )

  const onPieceClick = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (isGameOver || !square) return
      const turn = game.turn()
      const boardPiece = game.get(square as Parameters<Chess['get']>[0])
      if (!boardPiece || boardPiece.color !== turn) return
      selectSquare(square, game)
    },
    [game, isGameOver, selectSquare],
  )

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || isGameOver) return false
      const next = new Chess(game.fen())
      try {
        const move = next.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
        if (!move) return false
        savedGame.fen = next.fen()
        setGame(next)
        setFen(next.fen())
        clearSelection()
        return true
      } catch {
        return false
      }
    },
    [game, isGameOver, clearSelection],
  )

  const resetGame = useCallback(() => {
    const fresh = new Chess()
    savedGame.fen = fresh.fen()
    setGame(fresh)
    setFen(fresh.fen())
    clearSelection()
  }, [clearSelection])

  // Build per-square styles for selected + legal move highlights
  const squareStyles: Record<string, React.CSSProperties> = {}
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      background: isLightSquare(selectedSquare) ? SELECTED_LIGHT : SELECTED_DARK,
    }
  }
  for (const sq of legalTargets) {
    squareStyles[sq] = {
      background: isLightSquare(sq) ? MOVE_DOT_EMPTY : MOVE_DOT_EMPTY_DARK,
    }
  }
  for (const sq of captureTargets) {
    squareStyles[sq] = {
      background: isLightSquare(sq) ? CAPTURE_RING : CAPTURE_RING_DARK,
    }
  }

  const status = gameStatus(game)
  const isCheck = !isGameOver && game.isCheck()

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
          Coming Soon
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
          ML Chess Bot
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
          }}
        >
          Play both sides until the AI is ready
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 16px 0',
          boxSizing: 'border-box',
        }}
      >
        <Chessboard
          options={{
            position: fen,
            allowDragging: !isGameOver,
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

        <motion.button
          type="button"
          onClick={resetGame}
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
      </div>
    </motion.div>
  )
}
