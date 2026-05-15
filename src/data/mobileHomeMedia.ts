/**
 * Home-screen widgets (mobile view). Replace URLs with files under `public/mobile/`
 * (e.g. `/mobile/audio/song1.mp3`, `/mobile/covers/song1.jpg`).
 */
export interface MobilePlaylistTrack {
  title: string
  artist: string
  /** MP3 (or other browser-supported format) URL */
  audioUrl: string
  /** Square-ish cover image URL */
  coverUrl: string
}

export interface FriendsSlide {
  /** Photo URL (local under public/ or absolute HTTPS) */
  src: string
  alt?: string
}

/** Playlist for the bottom music widget (cycles when paused; advances on track end while playing). */
export const MOBILE_PLAYLIST: MobilePlaylistTrack[] = [
  {
    title: 'SoundHelix Demo',
    artist: 'SoundHelix',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://picsum.photos/seed/music-a/512/512',
  },
  {
    title: 'SoundHelix Demo 2',
    artist: 'SoundHelix',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://picsum.photos/seed/music-b/512/512',
  },
]

/** Full-bleed images for the Friends-style widget (auto + swipe). */
export const MOBILE_FRIENDS_GALLERY: FriendsSlide[] = [
  { src: 'https://picsum.photos/seed/friends-1/600/600', alt: 'Photo 1' },
  { src: 'https://picsum.photos/seed/friends-2/600/600', alt: 'Photo 2' },
  { src: 'https://picsum.photos/seed/friends-3/600/600', alt: 'Photo 3' },
]

/** Seconds between automatic playlist cover / metadata changes while paused */
export const MOBILE_MUSIC_ROTATE_INTERVAL_SEC = 10

/** Seconds between automatic photo advance in the Friends widget */
export const MOBILE_FRIENDS_ROTATE_INTERVAL_SEC = 5
