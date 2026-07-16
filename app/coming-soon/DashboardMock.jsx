'use client'

// A coded (not image) mini "Hero" question + progress dashboard, matching the
// reference artwork. Crisp at any DPI and theme-independent. Purely visual.

const NAVY = '#1B2B4B', GOLD = '#C49A1A'

function Bar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: '#EEF2F7', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  )
}

export default function DashboardMock() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 16, width: '100%', maxWidth: 640 }} className="cs-dash">
      {/* Question card (tablet) */}
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E7ECF3', boxShadow: '0 20px 50px rgba(27,43,75,0.14)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: NAVY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>H</span>
            <span style={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>Hero</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'rgba(196,154,26,0.12)', padding: '3px 10px', borderRadius: 99 }}>Level 4</span>
        </div>
        <p style={{ textAlign: 'center', fontWeight: 800, color: NAVY, fontSize: 18, margin: '4px 0 14px' }}>What is 7 × 6?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['36', false], ['42', false], ['43', false], ['48', true]].map(([n, ok], i) => (
            <div key={i} style={{
              padding: '14px 0', textAlign: 'center', borderRadius: 12, fontWeight: 800, fontSize: 18,
              border: `2px solid ${ok ? '#22C55E' : '#E7ECF3'}`,
              background: ok ? '#ECFDF5' : 'white',
              color: ok ? '#15803D' : NAVY, position: 'relative',
            }}>
              {n}{ok && <span style={{ position: 'absolute', top: 6, right: 8, color: '#22C55E', fontSize: 13 }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>★ Great job, Alex!</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'white', background: '#22C55E', padding: '7px 16px', borderRadius: 10 }}>Continue</span>
        </div>
      </div>

      {/* Progress card */}
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E7ECF3', boxShadow: '0 20px 50px rgba(27,43,75,0.10)', padding: 18 }}>
        <p style={{ fontWeight: 800, color: NAVY, fontSize: 14, margin: '0 0 2px' }}>Your Child's Progress</p>
        <p style={{ color: '#94A3B8', fontSize: 11, margin: '0 0 14px' }}>This Week</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[['Tasks', '24'], ['Accuracy', '88%'], ['Streak', '5 days']].map(([l, v], i) => (
            <div key={i} style={{ background: '#F7F9FC', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, color: NAVY, fontSize: 18 }}>{v}</div>
              <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{ fontWeight: 800, color: NAVY, fontSize: 12, margin: '0 0 10px' }}>Focus Areas</p>
        <Bar label="Multiplication" pct={82} color="#22C55E" />
        <Bar label="Fractions" pct={64} color={GOLD} />
        <Bar label="Word Problems" pct={48} color="#7C3AED" />
      </div>
    </div>
  )
}
