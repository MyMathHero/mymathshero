// Hero voice utility using browser Text-to-Speech
// Free for now — upgrade to OpenAI TTS after launch

let currentUtterance = null

export function heroSpeak(text, onStart, onEnd) {
  heroStop()

  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  const cleanText = text
    .replace(/[✦✦🤖🎯💪🎉😅🔥⚡🏆]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  currentUtterance = new SpeechSynthesisUtterance(cleanText)

  currentUtterance.rate = 0.85
  currentUtterance.pitch = 1.1
  currentUtterance.volume = 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Karen') ||
    v.name.includes('Google UK') ||
    v.name.includes('Female') ||
    (v.lang.startsWith('en') && v.localService)
  ) || voices.find(v => v.lang.startsWith('en')) || null

  if (preferredVoice) {
    currentUtterance.voice = preferredVoice
  }

  currentUtterance.onstart = () => onStart && onStart()
  currentUtterance.onend = () => onEnd && onEnd()
  currentUtterance.onerror = () => onEnd && onEnd()

  window.speechSynthesis.speak(currentUtterance)
}

export function heroStop() {
  if (typeof window === 'undefined') return
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function heroIsSpeaking() {
  if (typeof window === 'undefined') return false
  return window.speechSynthesis?.speaking || false
}
