// Hero Listen — capture the student's voice in the browser and transcribe it via
// /api/student/voice-transcribe (OpenAI Whisper). The other half of
// speech-to-speech tutoring (report #6): student talks → text → Hero replies →
// heroVoice speaks it back.
//
// Usage:
//   const rec = await startRecording()      // begins mic capture
//   ...
//   const text = await rec.stopAndTranscribe(studentId)   // returns transcript
//   rec.cancel()                            // abort without transcribing

export function isVoiceInputSupported() {
  return typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof window.MediaRecorder !== 'undefined'
}

export async function startRecording() {
  if (!isVoiceInputSupported()) throw new Error('Voice input not supported on this device')

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  // Pick a mime type the browser actually supports (Safari ≠ Chrome).
  const mime = ['audio/webm', 'audio/mp4', 'audio/ogg']
    .find(t => window.MediaRecorder.isTypeSupported?.(t)) || ''
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks = []
  recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data) }
  recorder.start()

  const cleanup = () => stream.getTracks().forEach(t => t.stop())

  return {
    cancel() {
      try { if (recorder.state !== 'inactive') recorder.stop() } catch {}
      cleanup()
    },
    // Stop recording, send the audio to Whisper, resolve with the transcript.
    stopAndTranscribe(studentId = null) {
      return new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          cleanup()
          try {
            const blob = new Blob(chunks, { type: mime || 'audio/webm' })
            if (!blob.size) { resolve(''); return }
            const ext = (mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm')
            const form = new FormData()
            form.append('audio', blob, `speech.${ext}`)
            if (studentId) form.append('studentId', studentId)
            const res = await fetch('/api/student/voice-transcribe', { method: 'POST', body: form })
            if (res.status === 403) { reject(new Error('premium_required')); return }
            if (!res.ok) { reject(new Error('transcription failed')); return }
            const data = await res.json()
            resolve((data.text || '').trim())
          } catch (err) {
            reject(err)
          }
        }
        try {
          if (recorder.state !== 'inactive') recorder.stop()
          else { cleanup(); resolve('') }
        } catch (err) { cleanup(); reject(err) }
      })
    },
  }
}
