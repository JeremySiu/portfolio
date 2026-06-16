/**
 * Parse MIDI with note durations (note-on → note-off pairs).
 * Builds a full tempo map so tick→second conversion is accurate even
 * when the MIDI contains multiple tempo-change events.
 */
const fs = require('fs');
const buf = fs.readFileSync('public/piano song/River Flows In You (2).mid');
let pos = 0;
const readUint32 = () => { const v = buf.readUInt32BE(pos); pos += 4; return v; };
const readUint16 = () => { const v = buf.readUInt16BE(pos); pos += 2; return v; };
const readVarLen = () => { let val=0,b; do{b=buf[pos++];val=(val<<7)|(b&0x7f);}while(b&0x80); return val; };

buf.slice(pos,pos+4).toString(); pos+=4; // 'MThd'
readUint32();  // header length
readUint16();  // format
const numTracks   = readUint16();
const ticksPerBeat = readUint16();

// ─── Pass 1: collect all raw events (notes + tempo changes) ──────────────────
const rawEvents  = []; // { tick, type, note, velocity, track }
const tempoChanges = [{ tick: 0, mpb: 500000 }]; // default 120 BPM

for (let t = 0; t < numTracks; t++) {
  buf.slice(pos,pos+4); pos+=4; // 'MTrk'
  const trkLen = readUint32();
  const trkEnd = pos + trkLen;
  let tick=0, running=0;
  while (pos < trkEnd) {
    tick += readVarLen();
    let st = buf[pos];
    if (st & 0x80) { running=st; pos++; } else { st=running; }
    const type=(st>>4)&0xf;
    if (st===0xff) {
      const mt=buf[pos++]; const ml=readVarLen();
      if (mt===0x51) {
        const mpb=(buf[pos]<<16)|(buf[pos+1]<<8)|buf[pos+2];
        tempoChanges.push({ tick, mpb });
      }
      pos+=ml;
    } else if(st===0xf0||st===0xf7) { pos+=readVarLen(); }
    else if(type===0x9) {
      const n=buf[pos++],v=buf[pos++];
      rawEvents.push({tick,type:v>0?'on':'off',note:n,velocity:v,track:t});
    } else if(type===0x8) {
      const n=buf[pos++]; pos++;
      rawEvents.push({tick,type:'off',note:n,velocity:0,track:t});
    } else if(type===0xa||type===0xb||type===0xe){pos+=2;}
    else if(type===0xc||type===0xd){pos+=1;}
    else pos+=1;
  }
  pos = trkEnd;
}

// ─── Build tempo map sorted by tick ─────────────────────────────────────────
tempoChanges.sort((a,b)=>a.tick-b.tick);

// Deduplicate: if multiple changes land on the same tick, keep the last one
const tempoMap = [];
for (const tc of tempoChanges) {
  if (tempoMap.length && tempoMap[tempoMap.length-1].tick === tc.tick) {
    tempoMap[tempoMap.length-1].mpb = tc.mpb;
  } else {
    tempoMap.push({ ...tc });
  }
}

// Pre-compute the absolute time (seconds) at the start of each tempo segment
let cumSec = 0;
for (let i = 0; i < tempoMap.length; i++) {
  tempoMap[i].startSec = cumSec;
  if (i + 1 < tempoMap.length) {
    const deltaTicks = tempoMap[i+1].tick - tempoMap[i].tick;
    cumSec += deltaTicks * tempoMap[i].mpb / (ticksPerBeat * 1000000);
  }
}

// ─── tick → seconds using the tempo map ─────────────────────────────────────
const tickToSec = (tick) => {
  // Find the last tempo segment whose start tick ≤ tick
  let seg = tempoMap[0];
  for (const s of tempoMap) {
    if (s.tick <= tick) seg = s;
    else break;
  }
  return seg.startSec + (tick - seg.tick) * seg.mpb / (ticksPerBeat * 1000000);
};

const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteName = n => names[n%12]+(Math.floor(n/12)-1);

console.log(`Tempo segments: ${tempoMap.length}`);
tempoMap.forEach(s => console.log(`  tick ${s.tick}  bpm ${(60000000/s.mpb).toFixed(2)}  startSec ${s.startSec.toFixed(3)}`));

// ─── Match note-ons with note-offs to get durations ──────────────────────────
const noteOnStack = {};
const notesWithDuration = [];

for (const e of rawEvents) {
  if (e.type === 'on') {
    if (!noteOnStack[e.note]) noteOnStack[e.note] = [];
    noteOnStack[e.note].push({ tick: e.tick, velocity: e.velocity, track: e.track });
  } else if (e.type === 'off') {
    const stack = noteOnStack[e.note];
    if (stack && stack.length > 0) {
      const on = stack.shift();
      const startSec = tickToSec(on.tick);
      const endSec   = tickToSec(e.tick);
      notesWithDuration.push({
        time:     parseFloat(startSec.toFixed(4)),
        note:     e.note,
        noteName: noteName(e.note),
        velocity: on.velocity,
        duration: parseFloat((endSec - startSec).toFixed(4)),
        track:    on.track,
      });
    }
  }
}

notesWithDuration.sort((a,b)=>a.time-b.time);

const lastTick = rawEvents.reduce((m,e)=>Math.max(m,e.tick),0);
console.log(`\nTotal notes with duration: ${notesWithDuration.length}`);
console.log(`Song length: ${tickToSec(lastTick).toFixed(2)}s`);

// ─── Save full data ───────────────────────────────────────────────────────────
fs.writeFileSync('midi_with_durations.json', JSON.stringify({ ticksPerBeat, tempoMap, notes: notesWithDuration }, null, 2));
console.log('Saved midi_with_durations.json');

// ─── Build gameplay beatmap (upper/right-hand melody voice) ──────────────────
const MELODY_MIN_NOTE = 69; // A4+
const GROUP_WINDOW    = 0.035;
const MIN_TILE_DUR    = 0.13;
const MAX_TILE_DUR    = 1.05;

const trebleNotes = notesWithDuration
  .filter(n => n.note >= MELODY_MIN_NOTE)
  .sort((a,b) => a.time - b.time || b.note - a.note);

const groups = [];
for (const n of trebleNotes) {
  const last = groups[groups.length-1];
  if (last && n.time - last.time <= GROUP_WINDOW) {
    last.notes.push(n);
  } else {
    groups.push({ time: n.time, notes: [n] });
  }
}

const melodyNotes = groups
  .map(g => g.notes.reduce((best,n) => (n.note > best.note ? n : best), g.notes[0]))
  .sort((a,b) => a.time - b.time || b.note - a.note);

const laneForNote = note => {
  if (note <= 72) return 0; // A4–C5
  if (note <= 76) return 1; // C#5–E5
  if (note <= 81) return 2; // F5–A5
  return 3;                 // A#5+
};

const beatmap = melodyNotes.map(n => ({
  time:     n.time,
  lane:     laneForNote(n.note),
  duration: Math.min(MAX_TILE_DUR, Math.max(MIN_TILE_DUR, n.duration || MIN_TILE_DUR)),
  noteName: n.noteName,
}));

const header = `// ============================================================================
// River Flows in You - Yiruma
// Beatmap auto-generated from MIDI - upper/right-hand melody voice
// Tempo-map aware: ${tempoMap.length} tempo segments | Notes: ${beatmap.length} | Melody cutoff: ${noteName(MELODY_MIN_NOTE)}+
// Lane mapping: 0=A4-C5, 1=C#5-E5, 2=F5-A5, 3=A#5+
// ============================================================================

export interface BeatNote {
  time: number; // seconds from start of audio
  lane: number; // 0-3, left to right
  duration: number; // seconds to hold key (drives tile height)
}

export const RIVER_FLOWS_BEATMAP: BeatNote[] = [
`;

const body = beatmap
  .map(n => `  { time: ${n.time.toFixed(4)}, lane: ${n.lane}, duration: ${n.duration.toFixed(4)} }, // ${n.noteName}`)
  .join('\n');

fs.writeFileSync('src/data/riverFlowsInYouBeatmap.ts', `${header}${body}\n];\n`);
console.log(`\nGenerated src/data/riverFlowsInYouBeatmap.ts with ${beatmap.length} melody notes`);
