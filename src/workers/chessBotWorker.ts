// Chess bot Web Worker. Runs off the main thread so the UI stays responsive
// while the engine searches.
//
// Decision flow per move request:
//   1. Lazy-load + cache the converted Hiarcs opening book (public/opening-book.json).
//   2. If the current position is in the book, pick a move by weighted random.
//   3. Otherwise fall back to the alpha-beta search engine.
//
// Message protocol:
//   in : { type: 'getMove', fen: string, timeLimitMs?: number }
//   out: { type: 'move', move: string | null, source: 'book' | 'engine', score?, depth? }

import { Chess } from 'chess.js'
import { findBestMove } from '../lib/chessEngine'

type BookEntry = [string, number] // [uci, weight]
type OpeningBook = Record<string, BookEntry[]>

interface GetMoveRequest {
  type: 'getMove'
  fen: string
  history?: string[]
  timeLimitMs?: number
  id?: number
}

interface MoveResponse {
  type: 'move'
  move: string | null
  source: 'book' | 'engine'
  score?: number
  depth?: number
  id?: number
}

const ctx = self as unknown as {
  postMessage: (msg: MoveResponse) => void
  addEventListener: (type: 'message', cb: (e: MessageEvent) => void) => void
}

let bookPromise: Promise<OpeningBook | null> | null = null

function loadBook(): Promise<OpeningBook | null> {
  if (!bookPromise) {
    bookPromise = fetch('/opening-book.json')
      .then((r) => (r.ok ? (r.json() as Promise<OpeningBook>) : null))
      .catch(() => null)
  }
  return bookPromise
}

function normalizeFen(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

// Weighted random selection over the book's candidate moves.
function pickWeighted(entries: BookEntry[]): string | null {
  const total = entries.reduce((sum, [, w]) => sum + Math.max(1, w), 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const [uci, w] of entries) {
    r -= Math.max(1, w)
    if (r <= 0) return uci
  }
  return entries[entries.length - 1][0]
}

function isLegalUci(fen: string, uci: string): boolean {
  const game = new Chess(fen)
  try {
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci[4] : undefined
    const mv = game.move(promotion ? { from, to, promotion } : { from, to })
    return Boolean(mv)
  } catch {
    return false
  }
}

async function chooseMove(fen: string, timeLimitMs: number, history: string[] = []): Promise<MoveResponse> {
  const book = await loadBook()
  if (book) {
    const entries = book[normalizeFen(fen)]
    if (entries && entries.length) {
      // Prefer the book, but only return a move that is actually legal here.
      for (let attempt = 0; attempt < 4; attempt++) {
        const uci = pickWeighted(entries)
        if (uci && isLegalUci(fen, uci)) {
          return { type: 'move', move: uci, source: 'book' }
        }
      }
    }
  }

  const result = findBestMove(fen, timeLimitMs, 64, history ?? [])
  return {
    type: 'move',
    move: result.move,
    source: 'engine',
    score: result.score,
    depth: result.depth,
  }
}

ctx.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as GetMoveRequest
  if (!data || data.type !== 'getMove') return
  const timeLimitMs = data.timeLimitMs ?? 1500
  chooseMove(data.fen, timeLimitMs, data.history ?? [])
    .then((res) => ctx.postMessage({ ...res, id: data.id }))
    .catch(() => ctx.postMessage({ type: 'move', move: null, source: 'engine', id: data.id }))
})
