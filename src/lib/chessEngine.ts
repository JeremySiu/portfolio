// Pure (no-DOM) chess search engine, safe to import inside a Web Worker.
//
// Approach:
//   - Negamax with fail-soft alpha-beta pruning.
//   - Iterative deepening (IDDFS) bounded by a wall-clock time budget.
//   - Quiescence search at the leaves (captures + check evasions) to dampen the
//     horizon effect.
//   - Move ordering: MVV-LVA for captures, killer-move heuristic, history
//     heuristic for quiet moves, plus a hint for the previous iteration's best.
//   - Tapered evaluation: material + piece-square tables (king interpolates
//     between a middlegame and an endgame table by game phase), pawn-structure
//     penalties (doubled / isolated), and a side-to-move mobility bonus.
//
// chess.js is used purely for legal move generation and make/undo. Scores are in
// centipawns from White's perspective; negamax flips sign per ply.

import { Chess } from 'chess.js'
import type { Move, PieceSymbol, Color, Square } from 'chess.js'

type VerboseMove = Move

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
}

const MATE = 1_000_000
const INF = 2_000_000

// All tables are written from White's perspective with index 0 = a8 ... 63 = h1
// (i.e. rank 8 first, file a first), matching chess.js board() iteration order.
// White pieces index directly; Black pieces mirror vertically.

// prettier-ignore
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
]

// prettier-ignore
const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
]

// prettier-ignore
const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
]

// prettier-ignore
const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
]

// prettier-ignore
const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
]

// prettier-ignore
const PST_KING_MG = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
]

// prettier-ignore
const PST_KING_EG = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
]

const PST: Record<Exclude<PieceSymbol, 'k'>, number[]> = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN,
}

// Per-piece contribution to "game phase". 24 = full opening material.
const PHASE_WEIGHT: Record<PieceSymbol, number> = { p: 0, n: 1, b: 1, r: 2, q: 4, k: 0 }
const MAX_PHASE = 24

const DOUBLED_PENALTY = 18
const ISOLATED_PENALTY = 16
const MOBILITY_WEIGHT = 1

// Search-scoped heuristics, reset at the start of each findBestMove call.
let killers: [string, string][] = []
let history: Record<string, number> = {}

class Timeout extends Error {}

function pstIndex(row: number, col: number, white: boolean): number {
  // board()[row][col]: row 0 = rank 8, col 0 = file a. White reads directly;
  // Black mirrors vertically so its tables share the same orientation.
  return white ? row * 8 + col : (7 - row) * 8 + col
}

// Static evaluation in centipawns, from White's perspective. `sideToMoveMoves`
// is the number of legal moves for the side to move (passed in by the caller,
// which has usually generated them already) and feeds a small mobility bonus.
function evaluate(game: Chess, sideToMoveMoves = 0): number {
  const board = game.board()
  let score = 0
  let phase = 0

  // Pawn file counts for doubled/isolated detection.
  const whitePawnFiles = [0, 0, 0, 0, 0, 0, 0, 0]
  const blackPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0]

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col]
      if (!cell) continue
      const white = cell.color === 'w'
      const idx = pstIndex(row, col, white)
      phase += PHASE_WEIGHT[cell.type]

      let pieceScore = PIECE_VALUE[cell.type]
      if (cell.type === 'k') {
        // Tapered: blended later once phase is known. Store both, resolve below.
      } else {
        pieceScore += PST[cell.type][idx]
      }

      if (cell.type === 'p') {
        if (white) whitePawnFiles[col]++
        else blackPawnFiles[col]++
      }

      score += white ? pieceScore : -pieceScore
    }
  }

  // King PST (tapered between middlegame and endgame tables).
  const egWeight = 1 - Math.min(phase, MAX_PHASE) / MAX_PHASE
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col]
      if (!cell || cell.type !== 'k') continue
      const white = cell.color === 'w'
      const idx = pstIndex(row, col, white)
      const kingScore = PST_KING_MG[idx] * (1 - egWeight) + PST_KING_EG[idx] * egWeight
      score += white ? kingScore : -kingScore
    }
  }

  // Pawn structure: doubled and isolated penalties.
  for (let f = 0; f < 8; f++) {
    if (whitePawnFiles[f] > 1) score -= (whitePawnFiles[f] - 1) * DOUBLED_PENALTY
    if (blackPawnFiles[f] > 1) score += (blackPawnFiles[f] - 1) * DOUBLED_PENALTY

    const leftW = f > 0 ? whitePawnFiles[f - 1] : 0
    const rightW = f < 7 ? whitePawnFiles[f + 1] : 0
    if (whitePawnFiles[f] > 0 && leftW === 0 && rightW === 0) score -= ISOLATED_PENALTY

    const leftB = f > 0 ? blackPawnFiles[f - 1] : 0
    const rightB = f < 7 ? blackPawnFiles[f + 1] : 0
    if (blackPawnFiles[f] > 0 && leftB === 0 && rightB === 0) score += ISOLATED_PENALTY
  }

  if (sideToMoveMoves) {
    score += (game.turn() === 'w' ? 1 : -1) * sideToMoveMoves * MOBILITY_WEIGHT
  }

  return score
}

// MVV-LVA: prioritise capturing valuable pieces with cheap attackers.
function captureScore(m: VerboseMove): number {
  const victim = m.captured ? PIECE_VALUE[m.captured] : 0
  const attacker = PIECE_VALUE[m.piece]
  return 100_000 + victim * 10 - attacker
}

function orderMoves(moves: VerboseMove[], ply: number, pvMove?: string): VerboseMove[] {
  const k = killers[ply]
  return moves
    .map((m) => {
      const key = m.from + m.to
      let s: number
      if (pvMove && key + (m.promotion ?? '') === pvMove) {
        s = 1_000_000
      } else if (m.captured) {
        s = captureScore(m)
      } else if (k && (k[0] === key || k[1] === key)) {
        s = 90_000
      } else {
        s = history[key] ?? 0
      }
      if (m.promotion) s += PIECE_VALUE[m.promotion]
      return { m, s }
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m)
}

function recordKiller(ply: number, m: VerboseMove): void {
  if (m.captured) return
  const key = m.from + m.to
  const k = killers[ply] ?? ['', '']
  if (k[0] !== key) {
    k[1] = k[0]
    k[0] = key
  }
  killers[ply] = k
  history[key] = (history[key] ?? 0) + 1
}

function quiesce(game: Chess, alpha: number, beta: number, deadline: number): number {
  if (Date.now() > deadline) throw new Timeout()

  const inCheck = game.inCheck()
  const moves = game.moves({ verbose: true }) as VerboseMove[]
  if (inCheck && moves.length === 0) return -MATE

  const sign = game.turn() === 'w' ? 1 : -1
  const standPat = sign * evaluate(game, moves.length)
  if (standPat >= beta) return standPat
  if (standPat > alpha) alpha = standPat

  // When in check, search all evasions; otherwise only captures/promotions.
  const tactical = inCheck ? moves : moves.filter((m) => m.captured || m.promotion)

  tactical.sort((a, b) => captureScore(b) - captureScore(a))

  let best = standPat
  for (const m of tactical) {
    game.move({ from: m.from, to: m.to, promotion: m.promotion })
    const score = -quiesce(game, -beta, -alpha, deadline)
    game.undo()
    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) break
  }
  return best
}

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  deadline: number,
): number {
  if (Date.now() > deadline) throw new Timeout()

  if (game.isCheckmate()) return -MATE + ply // prefer faster mates
  if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition()) return 0
  if (depth <= 0) return quiesce(game, alpha, beta, deadline)

  const moves = orderMoves(game.moves({ verbose: true }) as VerboseMove[], ply)
  let best = -INF
  for (const m of moves) {
    game.move({ from: m.from, to: m.to, promotion: m.promotion })
    const score = -negamax(game, depth - 1, -beta, -alpha, ply + 1, deadline)
    game.undo()
    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) {
      recordKiller(ply, m)
      break
    }
  }
  return best
}

export interface SearchResult {
  move: string | null
  score: number
  depth: number
}

// Iterative-deepening root search. Returns the best move in UCI form
// (e.g. "e2e4", "e7e8q") or null if there are no legal moves.
//
// `history` is the full list of UCI moves played in the real game so far.
// Replaying them gives the Chess instance position history, enabling
// isThreefoldRepetition() to fire correctly both at the root and inside the
// search tree when the engine visits a position for the third time overall.
export function findBestMove(
  fen: string,
  timeLimitMs = 1500,
  maxDepth = 64,
  priorMoves: string[] = [],
): SearchResult {
  let game: Chess
  if (priorMoves.length > 0) {
    game = new Chess()
    let replayOk = true
    for (const uci of priorMoves) {
      try {
        game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
      } catch {
        replayOk = false
        break
      }
    }
    if (!replayOk) game = new Chess(fen)
  } else {
    game = new Chess(fen)
  }
  const rootMoves = game.moves({ verbose: true }) as VerboseMove[]
  if (rootMoves.length === 0) return { move: null, score: 0, depth: 0 }

  killers = []
  history = {}
  const deadline = Date.now() + timeLimitMs

  // Light shuffle so equal-valued lines vary game to game.
  for (let i = rootMoves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rootMoves[i], rootMoves[j]] = [rootMoves[j], rootMoves[i]]
  }

  let bestMove = rootMoves[0]
  let bestScore = -INF
  let completedDepth = 0

  try {
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -INF
      const beta = INF
      const pv = bestMove.from + bestMove.to + (bestMove.promotion ?? '')
      const ordered = orderMoves(rootMoves, 0, pv)

      let iterBest = ordered[0]
      let iterScore = -INF
      for (const m of ordered) {
        game.move({ from: m.from, to: m.to, promotion: m.promotion })
        const score = -negamax(game, depth - 1, -beta, -alpha, 1, deadline)
        game.undo()
        if (score > iterScore) {
          iterScore = score
          iterBest = m
        }
        if (score > alpha) alpha = score
      }

      bestMove = iterBest
      bestScore = iterScore
      completedDepth = depth

      // Stop early on a forced mate or when out of time budget.
      if (Math.abs(bestScore) > MATE - 1000) break
      if (Date.now() > deadline) break
    }
  } catch (e) {
    if (!(e instanceof Timeout)) throw e
  }

  return {
    move: bestMove.from + bestMove.to + (bestMove.promotion ?? ''),
    score: bestScore,
    depth: completedDepth,
  }
}

// Tiny named exports kept for potential reuse/testing.
export { evaluate }
export type { VerboseMove, Color, Square }
