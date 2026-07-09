'use client'
import { useState, useEffect } from 'react'
import { Gamepad2 } from 'lucide-react'

// Parents now control ONLY whether the arcade is on/off. Play time is bought by
// the student with coins (100c → 5 min, 200c → 10 min), so the daily-minutes cap
// and allowed-days controls were removed (1 Jul 2026 update).
const DEFAULT_SETTINGS = {
  enabled: true,
}

// Self-contained parent control panel for Hero Arcade limits. Settings are
// stored per child on the children collection, so the panel includes a child
// selector and loads/saves the limits for whichever child is selected.
export default function ArcadeSettings({ parentId, children = [] }) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  const selectedChild = children.find(c => c.id === selectedChildId) || null

  // If the children list changes (e.g. a child is added), keep the selection valid.
  useEffect(() => {
    if (!children.some(c => c.id === selectedChildId)) {
      setSelectedChildId(children[0]?.id || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  // Load the selected child's settings whenever the selection changes.
  useEffect(() => {
    let cancelled = false
    if (!selectedChildId) { setLoading(false); return }
    setLoading(true)
    setSavedAt(null)
    setError('')
    ;(async () => {
      try {
        const res = await fetch(
          `/api/parent/arcade-settings?studentId=${selectedChildId}${parentId ? `&parentId=${parentId}` : ''}`
        )
        const data = await res.json()
        if (cancelled) return
        if (res.ok && !data.error) {
          setSettings({ ...DEFAULT_SETTINGS, ...data })
        } else {
          setSettings(DEFAULT_SETTINGS)
        }
      } catch {
        if (!cancelled) setSettings(DEFAULT_SETTINGS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedChildId, parentId])

  async function save(next) {
    setSettings(next)
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/parent/arcade-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, studentId: selectedChildId, settings: next }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Could not save settings')
      } else {
        setSavedAt(new Date())
      }
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
            <Gamepad2 size={18} className="text-[#C49A1A]" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">Hero Arcade Controls</h3>
            <p className="text-[11px] text-gray-400">
              Turn the Arcade on or off for {selectedChild?.name || 'your child'}
            </p>
          </div>
        </div>
        {/* Master on/off toggle */}
        <button
          onClick={() => save({ ...settings, enabled: !settings.enabled })}
          disabled={saving || loading || !selectedChildId}
          role="switch"
          aria-checked={settings.enabled}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-[#22C55E]' : 'bg-gray-300'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : ''}`}
          />
        </button>
      </div>

      {/* Child selector — only when there's more than one child. */}
      {children.length > 1 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Child
          </p>
          <select
            value={selectedChildId || ''}
            onChange={e => setSelectedChildId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy bg-white focus:outline-none focus:border-[#C49A1A]"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading Arcade settings…</p>
      ) : !selectedChildId ? (
        <p className="text-xs text-gray-400 py-2">No child selected.</p>
      ) : (
        <p className="text-xs text-gray-500 py-1">
          {settings.enabled
            ? 'Arcade is ON. Your child buys play time with the coins they earn (100 coins = 5 min, 200 coins = 10 min).'
            : 'Arcade is OFF. Your child can’t open games until you turn it back on.'}
        </p>
      )}

      {/* Status line */}
      <div className="mt-4 min-h-[16px]">
        {error ? (
          <p className="text-[11px] text-red-600 font-medium">{error}</p>
        ) : saving ? (
          <p className="text-[11px] text-gray-400">Saving…</p>
        ) : savedAt ? (
          <p className="text-[11px] text-emerald-600 font-medium">
            Saved · {savedAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
      </div>
    </div>
  )
}
