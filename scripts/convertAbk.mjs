// One-time converter: HiarcsBookRef2550Lite.abk  ->  public/opening-book.json
//
// ABK (Arena book) format reference: https://www.chessprogramming.org/ABK
//   - 25200-byte header (900 entries of 28 bytes), records begin at byte 25200.
//   - Each record is 28 bytes, little-endian:
//       fr:uint8 to:uint8 promotion:uint8 priority:uint8
//       games:int32 win:int32 loose:int32 ply:int32 nextMove:int32 nextSibling:int32
//   - Entry index -> byte offset = index * 28, so recArray[i] has entry index 900 + i.
//   - Square decode: file = sq & 7, rank = sq >> 3  (0 = a1 ... 63 = h8).
//   - Promotion: 1=r 2=n 3=b 4=q, 0=none.
//   - recArray[0] (entry 900) and its nextSibling chain are the moves from the
//     start position; a record's nextMove descends into the replies subtree.
//
// Output: { [normalizedFen]: [[uci, weight], ...] } where normalizedFen drops the
// halfmove/fullmove counters and weight = max(1, games + win - loose).
//
// Run:  node scripts/convertAbk.mjs [path-to-abk]

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Chess } from 'chess.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const ABK_PATH =
  process.argv[2] ||
  'C:/Users/jerem/Downloads/HiarcsBookRef2550Lite-abk/HiarcsBookRef2550Lite.abk'
const OUT_PATH = join(ROOT, 'public', 'opening-book.json')

const HEADER_BYTES = 25200
const ENTRY_BYTES = 28
const ROOT_INDEX = 900

// Tunables (overridable via env) to keep the JSON a reasonable size for the browser.
const MAX_PLY = Number(process.env.MAX_PLY ?? 20)
const MIN_GAMES = Number(process.env.MIN_GAMES ?? 1)

const FILES = 'abcdefgh'
const PROMO = { 1: 'r', 2: 'n', 3: 'b', 4: 'q' }

function squareToStr(sq) {
  return FILES[sq & 7] + ((sq >> 3) + 1)
}

function readRecord(buf, recIndex) {
  const off = HEADER_BYTES + recIndex * ENTRY_BYTES
  return {
    fr: buf.readUInt8(off),
    to: buf.readUInt8(off + 1),
    promotion: buf.readUInt8(off + 2),
    priority: buf.readUInt8(off + 3),
    games: buf.readInt32LE(off + 4),
    win: buf.readInt32LE(off + 8),
    loose: buf.readInt32LE(off + 12),
    ply: buf.readInt32LE(off + 16),
    nextMove: buf.readInt32LE(off + 20),
    nextSibling: buf.readInt32LE(off + 24),
  }
}

function recordUci(rec) {
  return squareToStr(rec.fr) + squareToStr(rec.to) + (PROMO[rec.promotion] || '')
}

function recordWeight(rec) {
  const v = rec.games + rec.win - rec.loose
  return v < 1 ? 1 : v
}

// Drop halfmove + fullmove counters: "pieces color castling ep"
function normalizeFen(fen) {
  return fen.split(' ').slice(0, 4).join(' ')
}

// Convert an entry index (nextMove / nextSibling) into a record-array index, or
// null when it points outside the record region (i.e. "no link").
function toRecIndex(entryIndex, recCount) {
  const i = entryIndex - ROOT_INDEX
  return i >= 0 && i < recCount ? i : null
}

function main() {
  console.log(`Reading ${ABK_PATH} ...`)
  const buf = readFileSync(ABK_PATH)
  const recCount = Math.floor((buf.length - HEADER_BYTES) / ENTRY_BYTES)
  console.log(`File size ${buf.length} bytes, ${recCount} records.`)

  const book = {}
  const visited = new Set()
  let positions = 0
  let nodes = 0

  // Walk a sibling chain starting at record index `startRec`, collecting the
  // candidate moves available in `game`'s current position, then recurse into
  // each move's reply subtree (nextMove).
  function traverse(game, startRec, ply) {
    if (ply >= MAX_PLY || startRec == null) return

    const fen = normalizeFen(game.fen())
    if (visited.has(fen)) return
    visited.add(fen)
    nodes++

    const moves = []
    const children = [] // { uci, nextRec } for recursion after recording moves

    let recIndex = startRec
    while (recIndex != null) {
      const rec = readRecord(buf, recIndex)
      const uci = recordUci(rec)
      if (rec.games >= MIN_GAMES) {
        moves.push([uci, recordWeight(rec)])
        const nextRec = toRecIndex(rec.nextMove, recCount)
        if (nextRec != null) children.push({ uci, nextRec })
      }
      recIndex = toRecIndex(rec.nextSibling, recCount)
    }

    if (moves.length) {
      book[fen] = moves
      positions++
      if (positions % 5000 === 0) console.log(`  ${positions} positions...`)
    }

    for (const { uci, nextRec } of children) {
      const child = new Chess(game.fen())
      try {
        const from = uci.slice(0, 2)
        const to = uci.slice(2, 4)
        const promotion = uci.length > 4 ? uci[4] : undefined
        const mv = child.move(promotion ? { from, to, promotion } : { from, to })
        if (!mv) continue
      } catch {
        continue
      }
      traverse(child, nextRec, ply + 1)
    }
  }

  traverse(new Chess(), 0, 0)

  const json = JSON.stringify(book)
  writeFileSync(OUT_PATH, json)
  console.log(
    `Done. ${positions} positions, ${nodes} nodes visited.\n` +
      `Wrote ${OUT_PATH} (${(json.length / 1024 / 1024).toFixed(2)} MB, MAX_PLY=${MAX_PLY}, MIN_GAMES=${MIN_GAMES}).`,
  )
}

main()
