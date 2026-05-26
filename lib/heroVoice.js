// Hero voice utility — queued so messages don't overlap
let messageQueue = []
let isCurrentlySpeaking = false

export function heroSpeak(text, onStart, onEnd) {
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  messageQueue.push({ text, onStart, onEnd })

  if (!isCurrentlySpeaking) {
    processQueue()
  }
}

function processQueue() {
  if (messageQueue.length === 0) {
    isCurrentlySpeaking = false
    return
  }

  isCurrentlySpeaking = true
  const { text, onStart, onEnd } = messageQueue.shift()

  const cleanText = text
    .replace(/[✦✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const utterance = new SpeechSynthesisUtterance(cleanText)
  utterance.rate = 0.85
  utterance.pitch = 1.1
  utterance.volume = 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Karen') ||
    v.name.includes('Google UK') ||
    (v.lang.startsWith('en') && v.localService)
  ) || voices.find(v => v.lang.startsWith('en'))

  if (preferred) utterance.voice = preferred

  utterance.onstart = () => onStart && onStart()
  utterance.onend = () => {
    onEnd && onEnd()
    setTimeout(() => processQueue(), 300)
  }
  utterance.onerror = () => {
    onEnd && onEnd()
    setTimeout(() => processQueue(), 300)
  }

  window.speechSynthesis.speak(utterance)
}

export function heroStop() {
  if (typeof window === 'undefined') return
  messageQueue = []
  isCurrentlySpeaking = false
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function heroClearQueue() {
  messageQueue = []
}

export function heroIsSpeaking() {
  if (typeof window === 'undefined') return false
  return isCurrentlySpeaking || window.speechSynthesis?.speaking || false
}
