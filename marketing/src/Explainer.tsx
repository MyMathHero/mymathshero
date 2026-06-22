import React from 'react'
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion'
import { SCENES, sec, NAVY } from './theme'
import { Hook, Problem, Diagnostic, AskHero, Delight, ParentTrust, CTA, Layout } from './scenes/scenes'

// One component renders every aspect ratio. `vertical` + screen dims come from
// the composition so 16:9, 9:16 and 1:1 all share this timeline.
export const Explainer: React.FC<{ layout: Layout }> = ({ layout }) => {
  const S = (key: keyof typeof SCENES) => ({ from: sec(SCENES[key].from), durationInFrames: sec(SCENES[key].dur) })
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Sequence {...S('hook')}><Hook layout={layout} /></Sequence>
      <Sequence {...S('problem')}><Problem layout={layout} /></Sequence>
      <Sequence {...S('diagnostic')}><Diagnostic layout={layout} /></Sequence>
      <Sequence {...S('askHero')}><AskHero layout={layout} /></Sequence>
      <Sequence {...S('delight')}><Delight layout={layout} /></Sequence>
      <Sequence {...S('parentTrust')}><ParentTrust layout={layout} /></Sequence>
      <Sequence {...S('cta')}><CTA layout={layout} /></Sequence>

      {/* Drop a royalty-free track at public/music.mp3 to enable the soundtrack.
          Left commented so the project renders before a track is chosen.
      <Audio src={staticFile('music.mp3')} volume={0.5} /> */}
    </AbsoluteFill>
  )
}
