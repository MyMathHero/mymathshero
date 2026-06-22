import React from 'react'
import { Composition } from 'remotion'
import { Explainer } from './Explainer'
import { TOTAL_FRAMES, FPS } from './theme'

// Three deliverables from one timeline. Screen-frame dimensions are tuned per
// aspect ratio so the device mock fits nicely in each.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Explainer16x9"
        component={Explainer}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ layout: { vertical: false, screenW: 1180, screenH: 680 } }}
      />
      <Composition
        id="Explainer9x16"
        component={Explainer}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ layout: { vertical: true, screenW: 880, screenH: 1100 } }}
      />
      <Composition
        id="Explainer1x1"
        component={Explainer}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{ layout: { vertical: false, screenW: 880, screenH: 620 } }}
      />
    </>
  )
}
