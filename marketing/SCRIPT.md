# MyMathsHero — Explainer Video Script & Shot List

**Length:** ~38s · **FPS:** 30 · **Outputs:** 16:9 (web/App Store/YouTube), 9:16 (Reels/TikTok/Shorts), 1:1 (IG feed)
**Tone:** warm, upbeat, reassuring. Captions ALWAYS on (social plays muted). Voiceover optional.

| # | Scene | Time | On screen | Caption | (Optional) VO |
|---|-------|------|-----------|---------|---------------|
| 1 | Hook | 0–4s | Hero robot waving, logo reveal | "Maths homework, minus the tears." | "Meet Hero — your child's AI maths buddy." |
| 2 | Problem | 4–9s | Sad Hero, floating numbers | "Every kid learns differently." / "One-size-fits-all doesn't work." | "Every child learns at their own pace." |
| 3 | Diagnostic | 9–16s | Screen: diagnostic placement | "Hero finds their exact level" / "in about 3 minutes." | "A quick check finds exactly where they are." |
| 4 | Ask Hero | 16–24s | Screen: Ask Hero step-by-step + thinking robot | "A patient AI tutor" / "that guides — never just gives the answer." | "Then Hero guides them, step by step — never just handing over answers." |
| 5 | Delight | 24–30s | Jumping robot, emoji burst | "Practice that feels like play" / "🎮 Arcade · 🏅 Badges · 🔥 Streaks" | "With games, badges and streaks that keep them coming back." |
| 6 | Parent trust | 30–35s | Screen: parent dashboard | "Parents see real progress" / "✨ Free first month" | "And you see real progress — your first month's free." |
| 7 | CTA | 35–38s | Logo, URL, store badges | "mymathshero.com.au · Prep–Year 6" | "MyMathsHero. Start free today." |

## Screen recordings needed (drop into `public/screens/`, then re-render)
Record at 1920×1080 on a seeded demo account, ~6–8s each, trimmed:
- `diagnostic.mp4` — a student moving through the placement quiz.
- `askhero.mp4` — Ask Hero giving a step-by-step hint in the student dashboard.
- `parent.mp4` — parent dashboard showing progress/skill heatmap.
(Until added, the video renders with labelled placeholder device frames.)

## Still-open decisions
- **Voiceover:** none / AI (ElevenLabs) / human read. If used, record to match the timings above.
- **Music:** pick a royalty-free upbeat track (Uppbeat / Pixabay), save as `public/music.mp3`, and uncomment the `<Audio>` line in `src/Explainer.tsx`. Keep the licence file.
