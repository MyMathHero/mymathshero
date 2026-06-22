# MyMathsHero — Marketing Video (Remotion)

**Isolated** marketing video project. It has its **own `package.json` and `node_modules`** and is **NOT** part of the Next.js app or the mobile app build. Nothing here affects the product — delete this whole folder and the app is unchanged.

## What it produces
A ~38s explainer in three aspect ratios from one timeline:
- `Explainer16x9` → website hero, App Store preview, YouTube
- `Explainer9x16` → Reels / TikTok / Shorts
- `Explainer1x1` → Instagram feed

## Use it
```bash
cd marketing
npm install          # installs ONLY into marketing/node_modules
npm run dev          # open Remotion Studio to preview/scrub
npm run render:all   # renders all three MP4s into out/
```

## Add the real screen recordings
1. Record `diagnostic.mp4`, `askhero.mp4`, `parent.mp4` (see `SCRIPT.md`).
2. Drop them in `public/screens/`.
3. Re-render — they replace the placeholder device frames automatically.

## Add music
Save a royalty-free track as `public/music.mp3` and uncomment the `<Audio>` line in `src/Explainer.tsx`.

## Structure
- `src/Root.tsx` — registers the 3 compositions
- `src/Explainer.tsx` — the shared timeline (sequences the scenes)
- `src/scenes/scenes.tsx` — Hook, Problem, Diagnostic, AskHero, Delight, ParentTrust, CTA
- `src/components.tsx` — Caption, FadeUp, ScreenFrame helpers
- `src/theme.ts` — palette + scene timings
- `public/robot`, `public/logos` — copies of brand assets (originals untouched)
- `SCRIPT.md` — script, shot list, open decisions
