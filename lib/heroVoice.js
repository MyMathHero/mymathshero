// Hero Voice — OpenAI TTS (gpt-4o-mini-tts, Australian-accented) via
// /api/hero-voice. NO browser-TTS fallback: if OpenAI is unavailable, plan-gated,
// or playback fails, Hero is simply silent (we never use the robotic on-device
// Web Speech voice).
// Two guards prevent overlap:
//   isCurrentlySpeaking — audio is currently playing
//   isFetchingTTS      — we've called the proxy and are awaiting its response
// While either is true, a new heroSpeak() only enqueues; processQueue() will
// pick it up after the current utterance finishes.
let currentAudio = null
let messageQueue = []
let isCurrentlySpeaking = false
let isFetchingTTS = false
// Lets heroStop() abort a TTS request that's still in flight, and a generation
// token so a fetch that resolves AFTER a stop can't start playing over the mic
// (this was the "Hero records itself" bug: stop cleared the flags but the
// pending fetch still reached currentAudio.play()).
let ttsController = null
let speakGeneration = 0

// onAudioStart(durationSeconds) fires the moment real audio begins playing, so a
// caller can reveal caption text in sync with the voice (item 4). It's optional.
export function heroSpeak(text, onStart, onEnd, studentId = null, onAudioStart = null) {
  if (typeof window === 'undefined') return
  messageQueue.push({ text, onStart, onEnd, studentId, onAudioStart })
  if (!isCurrentlySpeaking && !isFetchingTTS) {
    processQueue()
  }
}

async function processQueue() {
  if (messageQueue.length === 0) {
    isCurrentlySpeaking = false
    isFetchingTTS = false
    return
  }

  const { text, onStart, onEnd, studentId, onAudioStart } = messageQueue.shift()
  // Snapshot the generation for this utterance. If heroStop() bumps it while we
  // await the fetch, we must NOT start playing (the mic may now be open).
  const myGen = speakGeneration

  const cleanText = text
    .replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanText) {
    onEnd && onEnd()
    setTimeout(() => processQueue(), 0)
    return
  }

  onStart && onStart()

  // 1. Try OpenAI TTS through the proxy. The fetching flag blocks any other
  // heroSpeak call from kicking off browser TTS in parallel.
  isFetchingTTS = true

  try {
    const controller = new AbortController()
    ttsController = controller
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch('/api/hero-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, studentId }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (ttsController === controller) ttsController = null

    // Stopped (e.g. student pressed the mic) while we were fetching — bail out
    // BEFORE creating any audio, so nothing plays over the open microphone.
    if (myGen !== speakGeneration) {
      onEnd && onEnd()
      return
    }

    if (res.ok) {
      // Hand off from "fetching" to "speaking" before play() so neither flag
      // is false during the transition.
      isCurrentlySpeaking = true
      isFetchingTTS = false

      const blob = await res.blob()
      // Re-check after the async blob read: a stop may have landed in between.
      if (myGen !== speakGeneration) {
        isCurrentlySpeaking = false
        onEnd && onEnd()
        return
      }
      const url = URL.createObjectURL(blob)
      currentAudio = new Audio(url)
      // Tell the caller the real audio is starting + how long it runs, so the UI
      // can reveal caption text in time with the voice (item 4).
      currentAudio.onplaying = () => {
        const dur = Number.isFinite(currentAudio?.duration) ? currentAudio.duration : 0
        onAudioStart && onAudioStart(dur)
      }
      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 300)
      }
      currentAudio.onerror = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 300)
      }
      try {
        await currentAudio.play()
      } catch {
        // Autoplay blocked or playback error — stay silent, advance the queue.
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 200)
      }
      return // success — onended will advance the queue.
    }
    // Any non-OK (403 plan-gated, 503 no key, etc.) — stay silent.
  } catch {
    // Network error / abort — stay silent.
  }

  // OpenAI failed or unavailable — no fallback; advance the queue silently.
  isFetchingTTS = false
  isCurrentlySpeaking = false
  onEnd && onEnd()
  setTimeout(() => processQueue(), 0)
}

export function heroStop() {
  // Bump the generation so any in-flight processQueue() that resolves after this
  // point aborts instead of starting playback (prevents Hero playing over the
  // mic once the student presses to talk).
  speakGeneration++
  messageQueue = []
  isCurrentlySpeaking = false
  isFetchingTTS = false
  // Abort a TTS request that hasn't returned yet.
  if (ttsController) {
    try { ttsController.abort() } catch {}
    ttsController = null
  }
  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    try { currentAudio.src = '' } catch {}
    currentAudio = null
  }
}

export function heroClearQueue() {
  messageQueue = []
}

export function heroIsSpeaking() {
  if (typeof window === 'undefined') return false
  return isCurrentlySpeaking || isFetchingTTS
}
