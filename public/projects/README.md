# Project banner images

Drop project banner images into this folder. File names must match the project
`id` field defined in `src/data/content.ts` and the `bannerImage` path on each
project entry.

Current project IDs (drop the files below in this folder):

| Project       | File name             |
| ------------- | --------------------- |
| DevFlow       | `devflow.png`         |
| CloudVault    | `cloudvault.png`      |
| PulseMetrics  | `pulsemetrics.png`    |
| NoteSpace     | `notionclone.png`     |

## Recommendations

- Aspect ratio: roughly **16:9** works best with the current layout (e.g. 1280×720).
  Images are shown with `object-fit: cover` and a max height so thumbnails stay
  compact on wide screens.
- Format: `.png` is wired up by default. If you want to use `.jpg`, `.webp`,
  etc., update the `bannerImage` path on the matching entry in
  `src/data/content.ts`.
- Keep file sizes reasonable (<300 KB) — these load on the home screen.

If a banner file is missing, the card automatically falls back to a gradient
built from the project's `accent` colour with the emoji and project name on
top, so the grid still looks complete while you're sourcing artwork.
