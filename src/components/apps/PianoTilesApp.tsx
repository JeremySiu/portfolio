import { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppSurfaceContext } from '../../context/AppSurfaceContext'
import { RIVER_FLOWS_BEATMAP } from '../../data/riverFlowsInYouBeatmap'
import type { BeatNote } from '../../data/riverFlowsInYouBeatmap'

// =============================================================================
// Constants
// =============================================================================

type GameState = 'idle' | 'playing' | 'paused' | 'ended'
type HitType = 'perfect' | 'great' | 'good' | 'miss' | null

const HIT_COLORS: Record<string, string> = {
  perfect: '#ffd700',
  great: '#00e676',
  good: '#42a5f5',
  miss: '#ff1744',
}

// Reference-style: black tiles, full-height lanes, visible hit target.
const SCROLL_TIME = 2.2        // seconds of lookahead visible in canvas
// Game clock starts at -INTRO_DELAY so the first tile falls from the top before audio begins.
// Audio is scheduled to play exactly when the clock reaches 0.
const INTRO_DELAY = SCROLL_TIME
const HIT_LINE_RATIO = 0.69
const HIT_WINDOW_PERFECT = 0.12   // ±120 ms
const HIT_WINDOW_GREAT   = 0.22   // ±220 ms
const HIT_WINDOW_GOOD    = 0.35   // ±350 ms
const WRONG_LANE_PENALTY = 100
// Pixels per second = canvasH / SCROLL_TIME; tile height = duration * pps
const TILE_BORDER_RADIUS = 8
const UI_UPDATE_INTERVAL = 6
// Hold mechanic timing constants
const HOLD_PRESS_EARLY        = 0.35  // can start pressing this many seconds before note.time
const HOLD_AUTO_SCORE_BUFFER  = 0.25  // auto-score a held note this many seconds after it ends
const HOLD_EARLY_RELEASE_MISS = 0.55  // releasing this many seconds early = automatic miss

// Progress milestones — threshold is the fraction of notes hit (0–1)
const PROGRESS_MILESTONES = [
  { threshold: 0.06, left: '6%',  symbol: '★' },
  { threshold: 0.20, left: '20%', symbol: '★' },
  { threshold: 0.38, left: '38%', symbol: '★' },
  { threshold: 0.60, left: '60%', symbol: '♛' },
  { threshold: 0.82, left: '82%', symbol: '♛' },
]

const AUDIO_URL = '/piano%20song/River%20Flows%20In%20You%20(2).mp3'

const BG_MID = '#6ab4d8'     // fallback colour while image loads
const BG_IMAGE_URL = '/icons/piano-tiles-bg.png'

// =============================================================================
// Hit effect type
// =============================================================================

interface HitEffect {
  x: number
  y: number
  color: string
  alpha: number
  radius: number
  maxRadius: number
  type: HitType
}

// =============================================================================
// Stats for end screen
// =============================================================================

interface FinalStats {
  score: number
  perfect: number
  great: number
  good: number
  miss: number
  maxCombo: number
  totalNotes: number
}

// =============================================================================
// Active hold tracking
// =============================================================================

interface ActiveHold {
  noteIndex: number
  pressTime: number    // audio-context time when the lane was pressed
  pressDelta: number   // pressTime − note.time  (negative = early, positive = late)
}

// =============================================================================
// Component
// =============================================================================

export default function PianoTilesApp() {
  useContext(AppSurfaceContext)

  // -------------------------------------------------------------------------
  // React state (triggers re-render for UI)
  // -------------------------------------------------------------------------
  const [gameState, setGameState] = useState<GameState>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [displayCombo, setDisplayCombo] = useState(0)
  const [lastHitType, setLastHitType] = useState<HitType>(null)
  const [finalStats, setFinalStats] = useState<FinalStats | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [pressedLanes, setPressedLanes] = useState<Set<number>>(new Set())
  // Progress: 0–1 based on notes hit (not missed)
  const [progress, setProgress] = useState(0)
  // Increments on every real hit so the hit-label animation key is unique per hit
  const [hitAnimKey, setHitAnimKey] = useState(0)
  // Milestone burst animation state
  const [milestoneAnimation, setMilestoneAnimation] = useState<{ index: number; symbol: string } | null>(null)
  const [reachedMilestones, setReachedMilestones] = useState<Set<number>>(new Set())

  // -------------------------------------------------------------------------
  // Refs for game-loop state (no re-renders)
  // -------------------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioStartTimeRef = useRef(0)
  const pausedAtRef = useRef(0)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const hitCountsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 })
  const hitTilesRef = useRef<Set<number>>(new Set())
  const missedTilesRef = useRef<Set<number>>(new Set())
  const effectsRef = useRef<HitEffect[]>([])
  const frameCountRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')
  const containerSizeRef = useRef({ width: 400, height: 600 })
  const pressedLanesRef = useRef<Set<number>>(new Set())
  const progressRef = useRef(0)
  const hitAnimKeyRef = useRef(0)
  const reachedMilestonesRef = useRef<Set<number>>(new Set())
  // Maps lane → active hold data (note being held but not yet scored)
  const activeHoldsByLaneRef = useRef<Map<number, ActiveHold>>(new Map())
  const activePointerIdRef = useRef<number | null>(null)
  const activePointerLaneRef = useRef<number | null>(null)
  const activePointerTargetRef = useRef<HTMLElement | null>(null)

  // -------------------------------------------------------------------------
  // Memoize sorted beatmap
  // -------------------------------------------------------------------------
  const beatmap: BeatNote[] = useMemo(() => [...RIVER_FLOWS_BEATMAP], [])

  // -------------------------------------------------------------------------
  // Determine if desktop
  // -------------------------------------------------------------------------
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  }, [])

  // -------------------------------------------------------------------------
  // Audio loading
  // -------------------------------------------------------------------------
  const loadAudio = useCallback(async (): Promise<AudioBuffer> => {
    if (audioBufferRef.current) return audioBufferRef.current

    setAudioLoading(true)
    try {
      const ctx = audioCtxRef.current || new AudioContext()
      audioCtxRef.current = ctx

      const response = await fetch(AUDIO_URL)
      const arrayBuffer = await response.arrayBuffer()
      const decoded = await ctx.decodeAudioData(arrayBuffer)
      audioBufferRef.current = decoded
      return decoded
    } finally {
      setAudioLoading(false)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Container resize observer
  // -------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      containerSizeRef.current = {
        width: el.clientWidth,
        height: el.clientHeight,
      }
      const canvas = canvasRef.current
      if (canvas) {
        const dpr = window.devicePixelRatio || 1
        const w = el.clientWidth
        const h = el.clientHeight
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(Math.max(0, h) * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${Math.max(0, h)}px`
      }
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // -------------------------------------------------------------------------
  // Preload background image
  // -------------------------------------------------------------------------
  useEffect(() => {
    const img = new Image()
    img.src = BG_IMAGE_URL
    img.onload = () => { bgImageRef.current = img }
  }, [])

  // -------------------------------------------------------------------------
  // Get current audio time
  // -------------------------------------------------------------------------
  const getCurrentTime = useCallback((): number => {
    const ctx = audioCtxRef.current
    if (!ctx) return 0
    if (gameStateRef.current === 'paused') return pausedAtRef.current
    if (gameStateRef.current !== 'playing') return 0
    return ctx.currentTime - audioStartTimeRef.current
  }, [])

  const addHitEffect = useCallback((lane: number, type: HitType) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const canvasW = canvas.width / dpr
    const canvasH = canvas.height / dpr
    const laneWidth = canvasW / 4
    const strikeY = canvasH * HIT_LINE_RATIO

    effectsRef.current.push({
      x: laneWidth * lane + laneWidth / 2,
      y: strikeY - 10,
      color: type === 'miss' ? HIT_COLORS.miss : '#ffffff',
      alpha: 0.8,
      radius: 10,
      maxRadius: laneWidth * 0.55,
      type,
    })
  }, [])

  const applyWrongLanePenalty = useCallback((lane: number) => {
    comboRef.current = 0
    hitCountsRef.current.miss++
    scoreRef.current = Math.max(0, scoreRef.current - WRONG_LANE_PENALTY)
    addHitEffect(lane, 'miss')
    setDisplayScore(Math.round(scoreRef.current))
    setDisplayCombo(0)
    setLastHitType('miss')
    hitAnimKeyRef.current++
    setHitAnimKey(hitAnimKeyRef.current)
  }, [addHitEffect])

  // -------------------------------------------------------------------------
  // Score a completed hold (called on release or auto-expiry)
  // pressDelta = pressTime − note.time  (negative = early, positive = late)
  // -------------------------------------------------------------------------
  const scoreHold = useCallback(
    (
      noteIndex: number,
      _pressTime: number,
      releaseTime: number,
      pressDelta: number,
    ) => {
      if (hitTilesRef.current.has(noteIndex) || missedTilesRef.current.has(noteIndex)) return

      const note = beatmap[noteIndex]
      hitTilesRef.current.add(noteIndex)

      const noteEnd      = note.time + note.duration
      const absPressDelta   = Math.abs(pressDelta)
      const releaseDelta    = releaseTime - noteEnd   // negative = early, positive = late
      const absReleaseDelta = Math.abs(releaseDelta)

      // Releasing far too early is always a miss
      const tooEarlyRelease = releaseDelta < -HOLD_EARLY_RELEASE_MISS

      let type: HitType
      let points: number

      if (tooEarlyRelease) {
        type = 'miss'; points = -100; hitCountsRef.current.miss++
      } else {
        // For very short notes (< 80 ms) only press timing matters.
        // Otherwise take the worse of the weighted press / release offsets.
        const effectiveDelta =
          note.duration < 0.08
            ? absPressDelta
            : Math.max(absPressDelta * 0.65, absReleaseDelta * 0.75)

        if (effectiveDelta <= HIT_WINDOW_PERFECT) {
          type = 'perfect'; points = 300; hitCountsRef.current.perfect++
        } else if (effectiveDelta <= HIT_WINDOW_GREAT) {
          type = 'great';   points = 200; hitCountsRef.current.great++
        } else if (effectiveDelta <= HIT_WINDOW_GOOD) {
          type = 'good';    points = 100; hitCountsRef.current.good++
        } else {
          type = 'miss';    points = -100; hitCountsRef.current.miss++
        }
      }

      if (type !== 'miss') {
        comboRef.current++
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current
        scoreRef.current += points * (1 + Math.floor(comboRef.current / 10) * 0.1)
        const totalHits = hitTilesRef.current.size - hitCountsRef.current.miss
        progressRef.current = Math.min(1, totalHits / beatmap.length)
      } else {
        comboRef.current = 0
        scoreRef.current = Math.max(0, scoreRef.current + points)
      }

      addHitEffect(note.lane, type)
      setDisplayScore(Math.round(scoreRef.current))
      setDisplayCombo(comboRef.current)
      setLastHitType(type)
      setProgress(progressRef.current)
      hitAnimKeyRef.current++
      setHitAnimKey(hitAnimKeyRef.current)
      PROGRESS_MILESTONES.forEach((milestone, idx) => {
        if (!reachedMilestonesRef.current.has(idx) && progressRef.current >= milestone.threshold) {
          reachedMilestonesRef.current.add(idx)
          setReachedMilestones(new Set(reachedMilestonesRef.current))
          setMilestoneAnimation({ index: idx, symbol: milestone.symbol })
        }
      })
    },
    [addHitEffect, beatmap],
  )

  // -------------------------------------------------------------------------
  // Handle lane press — begin tracking a hold on the matching note
  // -------------------------------------------------------------------------
  const handleLanePress = useCallback(
    (lane: number, penalizeWrongLane = true) => {
      if (gameStateRef.current !== 'playing') return

      const currentTime = getCurrentTime()

      // Collect notes already being held so we skip them
      const heldNoteIndices = new Set<number>()
      activeHoldsByLaneRef.current.forEach((h) => heldNoteIndices.add(h.noteIndex))

      let bestIdx = -1
      let bestDelta = Infinity
      let hittableInOtherLane = false

      for (let i = 0; i < beatmap.length; i++) {
        if (hitTilesRef.current.has(i) || missedTilesRef.current.has(i) || heldNoteIndices.has(i)) continue
        const note = beatmap[i]
        const noteEnd = note.time + note.duration

        // Too early — tile hasn't reached press window yet
        if (currentTime < note.time - HOLD_PRESS_EARLY) continue
        // Too late — tile has fully passed the hit line
        if (currentTime > noteEnd + 0.08) continue

        if (note.lane !== lane) {
          hittableInOtherLane = true
          continue
        }

        const delta = Math.abs(note.time - currentTime)
        if (delta < bestDelta) { bestDelta = delta; bestIdx = i }
      }

      if (bestIdx === -1) {
        if (penalizeWrongLane && hittableInOtherLane) applyWrongLanePenalty(lane)
        return
      }

      const pressDelta = currentTime - beatmap[bestIdx].time
      activeHoldsByLaneRef.current.set(lane, { noteIndex: bestIdx, pressTime: currentTime, pressDelta })
    },
    [applyWrongLanePenalty, beatmap, getCurrentTime],
  )

  // -------------------------------------------------------------------------
  // Handle lane release — score the active hold for that lane
  // -------------------------------------------------------------------------
  const handleLaneRelease = useCallback(
    (lane: number) => {
      const hold = activeHoldsByLaneRef.current.get(lane)
      if (!hold) return
      activeHoldsByLaneRef.current.delete(lane)
      if (gameStateRef.current !== 'playing') return
      scoreHold(hold.noteIndex, hold.pressTime, getCurrentTime(), hold.pressDelta)
    },
    [getCurrentTime, scoreHold],
  )

  // -------------------------------------------------------------------------
  // End game
  // -------------------------------------------------------------------------
  const endGame = useCallback(() => {
    gameStateRef.current = 'ended'
    setGameState('ended')

    try { sourceNodeRef.current?.stop() } catch { /* already stopped */ }
    sourceNodeRef.current = null

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    // Clear any in-progress holds without scoring them
    activeHoldsByLaneRef.current.clear()

    const total = beatmap.length
    const { perfect, great, good, miss } = hitCountsRef.current
    const actualMisses = miss + (total - perfect - great - good - miss)

    setFinalStats({
      score: Math.round(scoreRef.current),
      perfect,
      great,
      good,
      miss: actualMisses,
      maxCombo: maxComboRef.current,
      totalNotes: total,
    })
  }, [beatmap.length])

  // -------------------------------------------------------------------------
  // Draw background (gradient + rays) — called each frame
  // -------------------------------------------------------------------------
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = bgImageRef.current
    if (img) {
      // Cover-fit: scale the image so it fills the canvas, cropping if needed
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth  * scale
      const dh = img.naturalHeight * scale
      const dx = (w - dw) / 2
      const dy = h - dh   // anchor to bottom
      ctx.drawImage(img, dx, dy, dw, dh)
    } else {
      // Fallback solid fill while image loads
      ctx.fillStyle = BG_MID
      ctx.fillRect(0, 0, w, h)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Game loop (requestAnimationFrame)
  // -------------------------------------------------------------------------
  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing') return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      rafRef.current = requestAnimationFrame(gameLoop)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const currentTime = getCurrentTime()
    const pixelsPerSecond = h / SCROLL_TIME
    const strikeY = h * HIT_LINE_RATIO
    const laneWidth = w / 4
    const tilePadding = 0

    // --- Background ---
    drawBackground(ctx, w, h)

    // --- Lane dividers (subtle white lines) ---
    ctx.strokeStyle = 'rgba(255,255,255,0.36)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const x = Math.round(laneWidth * i) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    // --- Auto-score holds that have run past their note end + buffer ---
    activeHoldsByLaneRef.current.forEach((hold, lane) => {
      const note = beatmap[hold.noteIndex]
      const noteEnd = note.time + note.duration
      if (currentTime > noteEnd + HOLD_AUTO_SCORE_BUFFER) {
        activeHoldsByLaneRef.current.delete(lane)
        // Player held all the way through — score as if released exactly at note end
        scoreHold(hold.noteIndex, hold.pressTime, noteEnd, hold.pressDelta)
      }
    })

    // --- Build held-note set for downstream checks ---
    const heldNoteSet = new Set<number>()
    activeHoldsByLaneRef.current.forEach((h) => heldNoteSet.add(h.noteIndex))

    // --- Auto-miss notes whose entire tile has passed without a press ---
    for (let i = 0; i < beatmap.length; i++) {
      if (hitTilesRef.current.has(i) || missedTilesRef.current.has(i) || heldNoteSet.has(i)) continue
      const note = beatmap[i]
      const noteEnd = note.time + note.duration
      if (currentTime > noteEnd + 0.10) {
        missedTilesRef.current.add(i)
        hitCountsRef.current.miss++
        comboRef.current = 0
        scoreRef.current = Math.max(0, scoreRef.current - 100)
      }
    }

    // --- Draw falling tiles ---
    for (let i = 0; i < beatmap.length; i++) {
      const note = beatmap[i]
      const timeDelta = note.time - currentTime

      // tile bottom edge Y = strikeY - timeDelta * pps
      // tile height = duration * pps
      const tileH = Math.max(8, note.duration * pixelsPerSecond)
      const tileBottomY = strikeY - timeDelta * pixelsPerSecond
      const tileTopY = tileBottomY - tileH

      // Cull off-screen
      if (tileBottomY < -20 || tileTopY > h + 20) continue

      // Skip hit tiles
      if (hitTilesRef.current.has(i)) continue

      const isMissed    = missedTilesRef.current.has(i)
      const isBeingHeld = heldNoteSet.has(i)
      const x = laneWidth * note.lane + tilePadding
      const tileW = laneWidth - tilePadding * 2

      ctx.save()

      if (isMissed) {
        const noteEnd = note.time + note.duration
        const fadeProgress = Math.min(1, (currentTime - noteEnd - 0.10) * 4)
        ctx.globalAlpha = Math.max(0, 1 - fadeProgress) * 0.5
        ctx.fillStyle = 'rgba(180,80,80,0.7)'
      } else if (isBeingHeld) {
        // Golden glow for the tile currently being held
        ctx.globalAlpha = 1
        const holdGrad = ctx.createLinearGradient(x, tileTopY, x, tileBottomY)
        holdGrad.addColorStop(0, 'rgba(255,240,90,0.98)')
        holdGrad.addColorStop(0.45, 'rgba(255,190,0,0.96)')
        holdGrad.addColorStop(1,  'rgba(255,115,0,0.90)')
        ctx.fillStyle = holdGrad
        ctx.shadowBlur = 18
        ctx.shadowColor = 'rgba(255,210,0,0.90)'
      } else {
        ctx.globalAlpha = 1
        ctx.fillStyle = '#111118'
        ctx.shadowBlur = 4
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
      }

      ctx.beginPath()
      ctx.roundRect(
        Math.round(x),
        Math.round(tileTopY),
        Math.round(tileW),
        Math.round(tileH),
        0,
      )
      ctx.fill()

      // Shine on top edge (brighter when held)
      if (!isMissed) {
        ctx.shadowBlur = 0
        ctx.globalAlpha = isBeingHeld ? 0.6 : 0.18
        ctx.fillStyle = 'rgba(255,255,255,1)'
        ctx.beginPath()
        ctx.roundRect(
          Math.round(x + 2),
          Math.round(tileTopY),
          Math.round(tileW - 4),
          Math.min(4, tileH * 0.15),
          [TILE_BORDER_RADIUS, TILE_BORDER_RADIUS, 0, 0],
        )
        ctx.fill()
      }

      ctx.restore()
    }

    // --- Hit target line ---
    const lineGrad = ctx.createLinearGradient(0, strikeY, 0, strikeY + 22)
    lineGrad.addColorStop(0, 'rgba(255,255,255,0.98)')
    lineGrad.addColorStop(0.35, 'rgba(255,255,255,0.62)')
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.fillStyle = lineGrad
    ctx.shadowBlur = 18
    ctx.shadowColor = 'rgba(255,255,255,1)'
    ctx.fillRect(0, Math.round(strikeY - 2), w, 7)
    ctx.globalAlpha = 0.4
    ctx.fillRect(0, Math.round(strikeY + 5), w, 24)
    ctx.restore()

    // --- Draw hit effects (ripple rings) ---
    effectsRef.current = effectsRef.current.filter((e) => {
      e.alpha -= 0.028
      e.radius += (e.maxRadius - e.radius) * 0.18

      if (e.alpha <= 0) return false

      ctx.save()
      ctx.globalAlpha = e.alpha * 0.7
      ctx.strokeStyle = e.color
      ctx.lineWidth = 2.5
      ctx.shadowBlur = 8
      ctx.shadowColor = e.color
      ctx.beginPath()
      ctx.arc(Math.round(e.x), Math.round(e.y), e.radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalAlpha = e.alpha * 0.35
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(Math.round(e.x), Math.round(e.y), e.radius * 0.55, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      return true
    })

    // --- Periodic React state update ---
    frameCountRef.current++
    if (frameCountRef.current % UI_UPDATE_INTERVAL === 0) {
      setDisplayScore(Math.round(scoreRef.current))
      setDisplayCombo(comboRef.current)
      setProgress(progressRef.current)
    }

    // --- Check if song ended ---
    const lastNoteTime = beatmap[beatmap.length - 1]?.time ?? 0
    if (currentTime > lastNoteTime + 2) {
      endGame()
      return
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [beatmap, getCurrentTime, drawBackground, endGame, scoreHold])

  // -------------------------------------------------------------------------
  // Pause game
  // -------------------------------------------------------------------------
  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== 'playing') return
    pausedAtRef.current = getCurrentTime()
    try { sourceNodeRef.current?.stop() } catch { /* already stopped */ }
    sourceNodeRef.current = null
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    gameStateRef.current = 'paused'
    setGameState('paused')
  }, [getCurrentTime])

  // -------------------------------------------------------------------------
  // Resume game
  // -------------------------------------------------------------------------
  const resumeGame = useCallback(async () => {
    if (gameStateRef.current !== 'paused') return

    const buffer = audioBufferRef.current
    const ctx = audioCtxRef.current
    if (!buffer || !ctx) return

    if (ctx.state === 'suspended') await ctx.resume()

    const offset = pausedAtRef.current
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => {
      if (gameStateRef.current === 'playing') endGame()
    }

    sourceNodeRef.current = source
    audioStartTimeRef.current = ctx.currentTime - offset
    if (offset < 0) {
      // Paused during intro: audio hasn't started yet, reschedule it in the future
      source.start(ctx.currentTime - offset, 0)
    } else {
      source.start(0, offset)
    }

    gameStateRef.current = 'playing'
    setGameState('playing')
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [endGame, gameLoop])

  // -------------------------------------------------------------------------
  // Start game
  // -------------------------------------------------------------------------
  const startGame = useCallback(async () => {
    scoreRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    hitCountsRef.current = { perfect: 0, great: 0, good: 0, miss: 0 }
    hitTilesRef.current = new Set()
    missedTilesRef.current = new Set()
    effectsRef.current = []
    frameCountRef.current = 0
    pausedAtRef.current = 0
    progressRef.current = 0

    setDisplayScore(0)
    setDisplayCombo(0)
    setLastHitType(null)
    setFinalStats(null)
    setProgress(0)
    reachedMilestonesRef.current = new Set()
    setReachedMilestones(new Set())
    setMilestoneAnimation(null)
    hitAnimKeyRef.current = 0
    setHitAnimKey(0)
    activeHoldsByLaneRef.current = new Map()

    const buffer = await loadAudio()
    const ctx = audioCtxRef.current!

    if (ctx.state === 'suspended') await ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => {
      if (gameStateRef.current === 'playing') endGame()
    }

    sourceNodeRef.current = source
    // Schedule audio to start INTRO_DELAY seconds from now so tiles have time to fall from the top.
    // Setting audioStartTimeRef ahead by INTRO_DELAY makes getCurrentTime() return -INTRO_DELAY
    // immediately, counting up to 0 when audio begins.
    audioStartTimeRef.current = ctx.currentTime + INTRO_DELAY
    source.start(ctx.currentTime + INTRO_DELAY, 0)

    gameStateRef.current = 'playing'
    setGameState('playing')
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [loadAudio, endGame, gameLoop])

  // -------------------------------------------------------------------------
  // Keyboard handler
  // -------------------------------------------------------------------------
  useEffect(() => {
    const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        if (gameStateRef.current === 'playing') {
          e.preventDefault()
          pauseGame()
          return
        }
        if (gameStateRef.current === 'paused') {
          e.preventDefault()
          resumeGame()
          return
        }
      }

      const lane = keyMap[e.key]
      if (lane === undefined) return
      if (e.repeat) return  // ignore OS key-repeat; hold is tracked via activeHoldsByLane

      if (gameStateRef.current === 'playing') {
        e.preventDefault()
        handleLanePress(lane)
        pressedLanesRef.current.add(lane)
        setPressedLanes(new Set(pressedLanesRef.current))
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const lane = keyMap[e.key]
      if (lane === undefined) return
      pressedLanesRef.current.delete(lane)
      setPressedLanes(new Set(pressedLanesRef.current))
      handleLaneRelease(lane)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [handleLanePress, handleLaneRelease, pauseGame, resumeGame])

  // -------------------------------------------------------------------------
  // Auto-pause when tab is hidden
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && gameStateRef.current === 'playing') pauseGame()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [pauseGame])

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      try { sourceNodeRef.current?.stop() } catch { /* ignore */ }
      try { audioCtxRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  // -------------------------------------------------------------------------
  // Grade calculation
  // -------------------------------------------------------------------------
  const getGrade = (stats: FinalStats): { letter: string; color: string } => {
    const accuracy =
      stats.totalNotes > 0
        ? ((stats.perfect * 300 + stats.great * 200 + stats.good * 100) /
            (stats.totalNotes * 300)) * 100
        : 0
    if (accuracy >= 95) return { letter: 'S', color: '#ffd700' }
    if (accuracy >= 85) return { letter: 'A', color: '#00e676' }
    if (accuracy >= 70) return { letter: 'B', color: '#42a5f5' }
    if (accuracy >= 50) return { letter: 'C', color: '#ff9800' }
    return { letter: 'D', color: '#ff1744' }
  }

  const getAccuracyPercent = (stats: FinalStats): number => {
    if (stats.totalNotes === 0) return 0
    return ((stats.perfect * 300 + stats.great * 200 + stats.good * 100) /
      (stats.totalNotes * 300)) * 100
  }

  // -------------------------------------------------------------------------
  // Piano key pointer handlers
  // -------------------------------------------------------------------------
  const getLaneFromClientX = useCallback((clientX: number): number => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return 0
    const relativeX = Math.max(0, Math.min(rect.width - 1, clientX - rect.left))
    return Math.max(0, Math.min(3, Math.floor(relativeX / (rect.width / 4))))
  }, [])

  const handlePointerDown = useCallback(
    (lane: number, e: ReactPointerEvent<HTMLElement>) => {
      activePointerIdRef.current = e.pointerId
      activePointerLaneRef.current = lane
      activePointerTargetRef.current = e.currentTarget
      try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* pointer capture unavailable */ }
      if (gameStateRef.current === 'playing') handleLanePress(lane)
      pressedLanesRef.current.add(lane)
      setPressedLanes(new Set(pressedLanesRef.current))
    },
    [handleLanePress],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return

      const nextLane = getLaneFromClientX(e.clientX)
      const previousLane = activePointerLaneRef.current
      if (nextLane === previousLane) return

      if (previousLane !== null) {
        pressedLanesRef.current.delete(previousLane)
        // Score the hold on the lane we're leaving
        handleLaneRelease(previousLane)
      }
      pressedLanesRef.current.add(nextLane)
      activePointerLaneRef.current = nextLane
      setPressedLanes(new Set(pressedLanesRef.current))

      if (gameStateRef.current === 'playing') handleLanePress(nextLane, false)
    },
    [getLaneFromClientX, handleLanePress, handleLaneRelease],
  )

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return

    const lane = activePointerLaneRef.current
    if (lane !== null) {
      pressedLanesRef.current.delete(lane)
      handleLaneRelease(lane)
    }
    try { activePointerTargetRef.current?.releasePointerCapture?.(e.pointerId) } catch { /* already released */ }
    activePointerIdRef.current = null
    activePointerLaneRef.current = null
    activePointerTargetRef.current = null
    setPressedLanes(new Set(pressedLanesRef.current))
  }, [handleLaneRelease])

  // =========================================================================
  // Render
  // =========================================================================

  const progressPercent = Math.max(0, Math.min(100, progress * 100))
  const progressMilestones = PROGRESS_MILESTONES

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: BG_MID,
        backgroundImage: `url(${BG_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* ================================================================= */}
      {/* Canvas — falls above piano keys                                   */}
      {/* ================================================================= */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'block',
        }}
      />

      {/* ================================================================= */}
      {/* Progress bar — very top of game area                              */}
      {/* ================================================================= */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 34,
            padding: '6px 12px 0',
            background: 'linear-gradient(180deg, rgba(72,46,0,0.48) 0%, rgba(72,46,0,0.08) 100%)',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'relative',
              height: 12,
              borderRadius: 6,
              background: 'rgba(36,25,3,0.78)',
              border: '1px solid rgba(255,226,118,0.82)',
              boxShadow: '0 0 18px rgba(255,213,62,0.62), inset 0 0 9px rgba(0,0,0,0.58)',
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                inset: '1px auto 1px 1px',
                borderRadius: 5,
                background: 'linear-gradient(180deg, #fff8b8 0%, #ffe45f 35%, #ffbf18 62%, #f08a00 100%)',
                boxShadow: '0 0 14px rgba(255,230,92,1), 0 0 24px rgba(255,177,0,0.9)',
                transformOrigin: 'left center',
                overflow: 'hidden',
              }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 1,
                  height: 3,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.95), rgba(255,255,255,0.18))',
                  opacity: 0.9,
                }}
              />
            </motion.div>
            {progressMilestones.map((mark, index) => {
              const reached = reachedMilestones.has(index)
              return (
                <div
                  key={`${mark.symbol}-${mark.left}`}
                  style={{
                    position: 'absolute',
                    left: mark.left,
                    top: '50%',
                    width: 28,
                    height: 28,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: reached ? '#fff9c9' : 'rgba(255,231,136,0.92)',
                    fontSize: mark.symbol === '★' ? 25 : 22,
                    lineHeight: 1,
                    textShadow: reached
                      ? '0 0 10px #fff8b8, 0 0 18px #ffc400, 0 1px 3px rgba(0,0,0,0.65)'
                      : '0 1px 3px rgba(0,0,0,0.75), 0 0 9px rgba(255,194,0,0.55)',
                    zIndex: index + 1,
                  }}
                >
                  {mark.symbol}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Score HUD                                                         */}
      {/* ================================================================= */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 0,
            right: 0,
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pointerEvents: 'none',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Score — centered like the reference */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 12px rgba(0,0,0,0.25)',
                lineHeight: 1,
              }}
            >
              {displayScore.toLocaleString()}
            </div>
            <AnimatePresence mode="wait">
              {lastHitType && (
                <motion.div
                  key={hitAnimKey}
                  initial={{ opacity: 0, y: 4, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: HIT_COLORS[lastHitType] || '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textShadow: `0 0 8px ${HIT_COLORS[lastHitType] || '#fff'}`,
                    marginTop: 2,
                  }}
                >
                  {lastHitType}!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pause button — top right */}
          <div style={{ marginLeft: 'auto', pointerEvents: 'auto' }}>
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                if (gameState === 'playing') pauseGame()
                else if (gameState === 'paused') resumeGame()
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(4px)',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
              }}
              title={gameState === 'paused' ? 'Resume (Space)' : 'Pause (Space)'}
            >
              {gameState === 'paused' ? '▶' : '⏸'}
            </button>
          </div>
        </div>
      )}

      {/* Combo display — left side, floating */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <AnimatePresence>
          {displayCombo > 1 && (
            <motion.div
              key="combo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                position: 'absolute',
                left: 14,
                top: '40%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1,
                  textShadow: '0 0 16px rgba(255,255,255,0.4)',
                }}
              >
                {displayCombo}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                COMBO
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ================================================================= */}
      {/* Piano Keys — dark style matching reference                        */}
      {/* ================================================================= */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          zIndex: 8,
          background: 'transparent',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {[0, 1, 2, 3].map((lane) => {
          const isPressed = pressedLanes.has(lane)
          return (
            <button
              key={lane}
              onPointerDown={(e) => {
                e.preventDefault()
                handlePointerDown(lane, e)
              }}
              style={{
                flex: 1,
                height: '100%',
                border: 'none',
                borderRight: lane < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                outline: 'none',
                cursor: 'pointer',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                padding: 0,
                background: isPressed
                  ? 'rgba(255,255,255,0.16)'
                  : 'transparent',
                transition: 'background 0.05s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 18,
              }}
            >
              {/* Bottom glow when pressed */}
              {isPressed && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '38%',
                    background: 'linear-gradient(0deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 45%, transparent 100%)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* Key number label */}
              {isDesktop && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isPressed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.05em',
                    transition: 'color 0.05s ease',
                    userSelect: 'none',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {lane + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ================================================================= */}
      {/* Pause Overlay                                                      */}
      {/* ================================================================= */}
      <AnimatePresence>
        {gameState === 'paused' && (
          <motion.div
            key="pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => resumeGame()}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(18,20,48,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              cursor: 'pointer',
              zIndex: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              Paused
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.02em',
                textShadow: '0 0 20px rgba(255,255,255,0.2)',
              }}
            >
              {displayScore.toLocaleString()}
            </div>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                marginTop: 4,
                padding: '12px 36px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ▶ Resume
            </motion.div>
            {isDesktop && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                Space or Esc to resume
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Start Screen Overlay                                              */}
      {/* ================================================================= */}
      <AnimatePresence>
        {gameState === 'idle' && (
          <motion.div
            key="start-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            onClick={startGame}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(120,140,220,0.55) 0%, rgba(100,120,200,0.45) 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              gap: 16,
            }}
          >
            {/* Song title */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.06em',
                textAlign: 'center',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              River Flows in You
            </motion.div>
            <motion.div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.04em',
              }}
            >
              Yiruma
            </motion.div>

            {/* Tap to start — pulsing */}
            <motion.div
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                marginTop: 20,
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textShadow: '0 2px 18px rgba(0,0,0,0.35)',
                textAlign: 'center',
              }}
            >
              {audioLoading ? 'Loading…' : 'Tap to Play'}
            </motion.div>

            {/* Desktop key hint */}
            {isDesktop && !audioLoading && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                style={{
                  position: 'absolute',
                  bottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                }}
              >
                <span>Use keys</span>
                {['1', '2', '3', '4'].map((k) => (
                  <span
                    key={k}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {k}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* End Screen Overlay                                                */}
      {/* ================================================================= */}
      <AnimatePresence>
        {gameState === 'ended' && finalStats && (
          <motion.div
            key="end-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,12,40,0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 22,
                padding: '30px 26px',
                maxWidth: 360,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                Song Complete!
              </div>

              {/* Progress bar summary */}
              <div
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(finalStats.perfect + finalStats.great + finalStats.good) / finalStats.totalNotes * 100}%` }}
                  transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #7b8edc, #c8d8ff)',
                    borderRadius: 3,
                  }}
                />
              </div>

              {/* Grade */}
              {(() => {
                const grade = getGrade(finalStats)
                return (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.28, type: 'spring', stiffness: 280, damping: 14 }}
                    style={{
                      fontSize: 52,
                      fontWeight: 900,
                      color: grade.color,
                      textShadow: `0 0 28px ${grade.color}55`,
                      lineHeight: 1,
                    }}
                  >
                    {grade.letter}
                  </motion.div>
                )
              })()}

              {/* Score */}
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {finalStats.score.toLocaleString()}
              </div>

              {/* Accuracy */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                {getAccuracyPercent(finalStats).toFixed(1)}% Accuracy
              </div>

              {/* Stats grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '7px 22px',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                {[
                  { label: 'Perfect', value: finalStats.perfect, color: HIT_COLORS.perfect },
                  { label: 'Great', value: finalStats.great, color: HIT_COLORS.great },
                  { label: 'Good', value: finalStats.good, color: HIT_COLORS.good },
                  { label: 'Miss', value: finalStats.miss, color: HIT_COLORS.miss },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>{stat.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Max combo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Max Combo</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#ffd700' }}>{finalStats.maxCombo}x</span>
              </div>

              {/* Play Again */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setGameState('idle')
                  gameStateRef.current = 'idle'
                  setProgress(0)
                  progressRef.current = 0
                }}
                style={{
                  marginTop: 8,
                  padding: '13px 38px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'linear-gradient(135deg, rgba(120,140,220,0.35) 0%, rgba(90,110,190,0.25) 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  outline: 'none',
                  transition: 'background 0.2s',
                }}
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Milestone achievement burst animation                             */}
      {/* ================================================================= */}
      {milestoneAnimation !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 35,
            pointerEvents: 'none',
          }}
        >
          {/* Radial glow burst */}
          <motion.div
            key={`milestone-glow-${milestoneAnimation.index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.2, 5.5], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 130,
              height: 130,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,235,80,0.98) 0%, rgba(255,170,0,0.55) 42%, transparent 70%)',
            }}
          />
          {/* Star / Crown — flies up from the progress bar to center */}
          <motion.div
            key={`milestone-star-${milestoneAnimation.index}`}
            initial={{ scale: 0.1, y: -260, opacity: 0 }}
            animate={{
              scale: [0.1, 2.6, 1.9, 1.9, 0.3],
              y:     [-260,   0,   0,   0,   0],
              opacity: [0,    1,   1,   1,   0],
            }}
            transition={{ duration: 1.65, times: [0, 0.2, 0.46, 0.78, 1] }}
            onAnimationComplete={() => setMilestoneAnimation(null)}
            style={{
              fontSize: 88,
              lineHeight: 1,
              position: 'relative',
              zIndex: 1,
              color: '#ffd700',
              textShadow:
                '0 0 22px #ffc400, 0 0 50px rgba(255,145,0,0.95), 0 5px 18px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 0 18px rgba(255,210,0,0.85))',
            }}
          >
            {milestoneAnimation.symbol}
          </motion.div>
        </div>
      )}
    </div>
  )
}
