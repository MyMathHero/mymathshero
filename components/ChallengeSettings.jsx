'use client'
import { useState, useEffect } from 'react'
import { Swords } from 'lucide-react'

// Parent control panel for the Hero Speed Challenge (1v1 online maths race).
// Parents can turn it on/off and pick an availability window. Stored per child.
// Mirrors ArcadeSettings' structure + ownership handling.
const DEFAULT_SETTINGS = { enabled: true, availability: 'always' }
const AVAILABILITY = [
  { id: 'always', label: 'Always' },
  { id: 'after-school', label: 'After school' },
  { id: 'weekends', label: 'Weekends' },
]

export default function ChallengeSettings({ parentId, children = [] }) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  const selectedChild = children.find(c => c.id === selectedChildId) || null

  useEffect(() => {
    if (!children.some(c => c.id === selectedChildId)) setSelectedChildId(children[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  useEffect(() => {
    let cancelled = false
    if (!selectedChildId) { setLoading(false); return }
    setLoading(true); setSavedAt(null); setError('')
    ;(async () => {
      try {
        const res = await fetch(`/api/parent/challenge-settings?studentId=${selectedChildId}${parentId ? `&parentId=${parentId}` : ''}`)
        const data = await res.json()
        if (cancelled) return
        setSettings(res.ok && !data.error ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS)
      } catch {
        if (!cancelled) setSettings(DEFAULT_SETTINGS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedChildId, parentId])

  async function save(next) {
    setSettings(next); setSaving(true); setError('')
    try {
      const res = await fetch('/api/parent/challenge-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, studentId: selectedChildId, settings: next }),
      })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || 'Could not save settings')
      else setSavedAt(new Date())
    } catch {
      setError('Network error — settings not saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#C49A1A]/10 flex items-center justify-center">
            <Swords size={18} className="text-[#C49A1A]" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">Hero Speed Challenge</h3>
            <p className="text-[11px] text-gray-400">
              Safe 1v1 maths races for {selectedChild?.name || 'your child'} — no chat, first name + avatar only
            </p>
          </div>
        </div>
        <button
          onClick={() => save({ ...settings, enabled: !settings.enabled })}
          disabled={saving || loading || !selectedChildId}
          role="switch"
          aria-checked={settings.enabled}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-[#22C55E]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {children.length > 1 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Child</p>
          <select
            value={selectedChildId || ''}
            onChange={e => setSelectedChildId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:border-[#C49A1A]"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading Challenge settings…</p>
      ) : !selectedChildId ? (
        <p className="text-xs text-gray-400 py-2">No child selected.</p>
      ) : (
        <div className={settings.enabled ? '' : 'opacity-40 pointer-events-none'}>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Availability</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY.map(a => (
              <button
                key={a.id}
                onClick={() => save({ ...settings, availability: a.id })}
                disabled={saving}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  settings.availability === a.id
                    ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 min-h-[16px]">
        {error ? <p className="text-[11px] text-red-600 font-medium">{error}</p>
          : saving ? <p className="text-[11px] text-gray-400">Saving…</p>
          : savedAt ? <p className="text-[11px] text-emerald-600 font-medium">Saved · {savedAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
          : null}
      </div>
    </div>
  )
}
