/**
 * Home-screen widgets (mobile view). Audio files are served from S3.
 */

const AUDIO_BASE_URL = 'https://portfoliosongs.s3.us-east-1.amazonaws.com'

export interface MobilePlaylistTrack {
  title: string
  artist: string
  /** MP3 (or other browser-supported format) URL */
  audioUrl: string
  /** Square-ish cover image URL */
  coverUrl: string
  /** Local fallback cover used if coverUrl fails to load */
  fallbackCoverUrl?: string
}

export interface FriendsSlide {
  /** Photo URL (local under public/ or absolute HTTPS) */
  src: string
  alt?: string
  /** CSS object-position when using object-fit: cover (default: center) */
  objectPosition?: string
}

/** Fisher–Yates shuffle (copy). Order changes once per page load. */
function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function track(
  filename: string,
  title: string,
  artist: string,
  coverUrl: string,
  localCover?: string,
): MobilePlaylistTrack {
  return {
    title,
    artist,
    audioUrl: `${AUDIO_BASE_URL}/${encodeURIComponent(filename)}`,
    coverUrl,
    ...(localCover
      ? { fallbackCoverUrl: `/album covers/${encodeURIComponent(localCover)}` }
      : {}),
  }
}

const MOBILE_PLAYLIST_SOURCE: MobilePlaylistTrack[] = [
  track(
    'Ben_Platt-Waving_Through_A_Window.mp3',
    'Waving Through a Window',
    'Ben Platt',
    'https://i.scdn.co/image/ab67616d0000b273eefa3ed06dec22db89d0e793',
    'Waving Through A Window.jpg',
  ),
  track(
    'Bruno_Mars-Grenade.mp3',
    'Grenade',
    'Bruno Mars',
    'https://i.scdn.co/image/ab67616d0000b2737039c1c841fc3dfa2ad8a0d8',
    'Grenade.jpg',
  ),
  track(
    'Carly_Rae_Jepsen-Call_Me_Maybe.mp3',
    'Call Me Maybe',
    'Carly Rae Jepsen',
    'https://i.scdn.co/image/ab67616d0000b273d3ee4bf67c2ac2154006ad72',
    'Call Me Maybe.jpg',
  ),
  track(
    'Coldplay-A_Sky_Full_of_Stars.mp3',
    'A Sky Full of Stars',
    'Coldplay',
    'https://i.scdn.co/image/ab67616d0000b273e5a95573f1b91234630fd2cf',
    'Sky Full of Stars.jpg',
  ),
  track(
    'Eve-Kaikai_Kitan.mp3',
    'Kaikai Kitan',
    'Eve',
    'https://i.scdn.co/image/ab67616d0000b273b47d8a9e844189f69d5e58a7',
    'Kaikai Kitan.jpg',
  ),
  track(
    'Fall_Out_Boy-Immortals.mp3',
    'Immortals',
    'Fall Out Boy',
    'https://i.scdn.co/image/ab67616d0000b273aa2f6d76b26a76b7a4f3a053',
    'Immortals.jpg',
  ),
  track(
    'Flo_Rida-My_House.mp3',
    'My House',
    'Flo Rida',
    'https://i.scdn.co/image/ab67616d0000b2736ba3d11e51c7df825292307f',
    'My House.jpg',
  ),
  track(
    'Fun-We_Are_Young.mp3',
    'We Are Young',
    'Fun',
    'https://i.scdn.co/image/ab67616d0000b273a036e1724bc7f2bab15cfda8',
    'We Are Young.jpg',
  ),
  track(
    'Goose_house-光るなら.mp3',
    '光るなら',
    'Goose house',
    'https://i.scdn.co/image/ab67616d0000b27306af611e549c60625661a788',
    '光るなら.jpg',
  ),
  track(
    'Joe_Hisaishi-Merry-Go-Round-of-Life.mp3',
    'Merry-Go-Round of Life',
    'Joe Hisaishi',
    'https://i.scdn.co/image/ab67616d0000b27362c1f3370811c52ae2d26d24',
    'Merry Go Round Of Life.jpg',
  ),
  track(
    'Justin_Bieber-Beauty_And_A_Beat.mp3',
    'Beauty and a Beat',
    'Justin Bieber ft. Nicki Minaj',
    'https://i.scdn.co/image/ab67616d0000b2736c20c4638a558132ba95bc39',
    'Beauty and a Beat.jpg',
  ),
  track(
    'Katy_Perry-Last_Friday_Night_(T.G.I.F).mp3',
    'Last Friday Night (T.G.I.F.)',
    'Katy Perry',
    'https://i.scdn.co/image/ab67616d0000b273937af329667311f4b2831616',
    'Last Friday Night.jpg',
  ),
  track(
    'LiSA-紅蓮華.mp3',
    '紅蓮華',
    'LiSA',
    'https://i1.sndcdn.com/artworks-000640100413-69mq2s-t500x500.jpg',
    '紅蓮華.jpg',
  ),
  track(
    'Maroon_5-Payphone_ft._Wiz_Khalifa.mp3',
    'Payphone',
    'Maroon 5 ft. Wiz Khalifa',
    'https://i.scdn.co/image/ab67616d0000b2733119f490f02fcee6514e8604',
    'Payphone.png',
  ),
  track(
    'Matt_Maher-Lord,_I_Need_You.mp3',
    'Lord, I Need You',
    'Matt Maher',
    'https://i.scdn.co/image/ab67616d0000b27386bac647be85db779e113131',
    'Lord I Need You.jpg',
  ),
  track(
    'Miley_Cyrus-Party_In_The_USA.mp3',
    'Party in the U.S.A.',
    'Miley Cyrus',
    'https://i.scdn.co/image/ab67616d0000b273d6c3ad6a2a27471e1d5e8103',
    'Party in the USA.jpg',
  ),
  track(
    'One_Direction-Live_While_We\'re_Young.mp3',
    'Live While We\'re Young',
    'One Direction',
    'https://i.scdn.co/image/ab67616d0000b2734e31e0d38b89b8fb239d4fbf',
    'Live While We\'re Young.jpg',
  ),
  track(
    'OneRepublic-Counting Stars.mp3',
    'Counting Stars',
    'OneRepublic',
    'https://upload.wikimedia.org/wikipedia/en/9/96/OneRepublic_-_Native.png',
    'Counting Stars.png',
  ),
  track(
    'Owl_City-Fireflies.mp3',
    'Fireflies',
    'Owl City',
    'https://i.scdn.co/image/ab67616d0000b273785d4e702802da500fc78b32',
    'Fireflies.jpg',
  ),
  track(
    'Rascar_Flatts-Life_Is_A_Highway.mp3',
    'Life Is a Highway',
    'Rascal Flatts',
    'https://i.scdn.co/image/ab67616d0000b273a73bb6afa8cb999aafb3c150',
    'Life Is A Highway.jpg',
  ),
  track(
    'Taio_Cruz-Dynamite.mp3',
    'Dynamite',
    'Taio Cruz',
    'https://i.scdn.co/image/ab67616d0000b273c434f98f315c12a0f4d049a0',
    'Dynamite.jpg',
  ),
  track(
    'Twenty_One_Pilots-Stressed_Out.mp3',
    'Stressed Out',
    'Twenty One Pilots',
    'https://i.scdn.co/image/ab67616d0000b273ae73318dd6e18759c8b87766',
    'Stressed Out.jpg',
  ),
  track(
    'Wiz_Khalifa-See_You_Again_ft._Charlie_Puth.mp3',
    'See You Again',
    'Wiz Khalifa ft. Charlie Puth',
    'https://i.scdn.co/image/ab67616d0000b273633a2d775747bccfbcb17a45',
  ),
  track(
    'Zac_Efron-Rewrite_The_Stars.mp3',
    'Rewrite the Stars',
    'Zac Efron & Zendaya',
    'https://i.scdn.co/image/ab67616d0000b273128057b40732c042c86de1dd',
  ),
]

/** Playlist for the bottom music widget (cycles when paused; advances on track end while playing). Shuffled per session. */
export const MOBILE_PLAYLIST: MobilePlaylistTrack[] = shuffle(MOBILE_PLAYLIST_SOURCE)

/** Full-bleed images for the Friends-style widget (auto + swipe). */
export const MOBILE_FRIENDS_GALLERY: FriendsSlide[] = [
  { src: '/pictures/pic1.jpg', alt: 'Photo 1' },
  { src: '/pictures/pic2.jpg', alt: 'Photo 2', objectPosition: 'center bottom' },
  { src: '/pictures/pic3.jpg', alt: 'Photo 3' },
  { src: '/pictures/pic4.jpg', alt: 'Photo 4', objectPosition: 'right center' },
  { src: '/pictures/pic5.jpg', alt: 'Photo 5' },
]

/** Seconds between automatic playlist cover / metadata changes while paused */
export const MOBILE_MUSIC_ROTATE_INTERVAL_SEC = 10

/** Seconds between automatic photo advance in the Friends widget */
export const MOBILE_FRIENDS_ROTATE_INTERVAL_SEC = 5
