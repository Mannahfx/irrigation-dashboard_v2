import { useState, useEffect } from 'react'
import { logActivity } from '../lib/activityLogger'
import styles from './TimerSlots.module.css'

const DEFAULT_SLOTS = Array.from({ length: 15 }, (_, i) => ({
  slot: i + 1, hour: 6, minute: 0, duration: 30, enabled: false
}))

export default function TimerSlots({ kitId, timersJson, publish, connected, user, profile }) {
  const [slots, setSlots] = useState(DEFAULT_SLOTS)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (!timersJson) return
    try {
      const parsed = JSON.parse(timersJson)
      setSlots(parsed)
    } catch {}
  }, [timersJson])

  function update(i, field, value) {
    setSlots(prev => prev.map((s, idx) =>
      idx === i ? { ...s, [field]: value } : s
    ))
  }

  function sendSlot(i) {
    if (!kitId) return
    const s = slots[i]
    const payload = JSON.stringify({
      slot:     s.slot,
      hour:     parseInt(s.hour),
      minute:   parseInt(s.minute),
      duration: parseInt(s.duration),
      enabled:  s.enabled,
    })
    publish(`${kitId}/timers/set`, payload)
    setSaved(i)
    setTimeout(() => setSaved(null), 2000)
    if (user) {
      logActivity(
        user.id, user.email, 'TIMER_SET',
        `Timer slot ${s.slot}: ${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')} for ${s.duration}min (${s.enabled ? 'enabled' : 'disabled'})`,
        profile?.device_id || kitId
      )
    }
  }

  function clearAll() {
    if (!kitId) return
    if (window.confirm('Clear all 15 timer slots?')) {
      publish(`${kitId}/timers/clearall`, '1')
      if (user) {
        logActivity(user.id, user.email, 'TIMER_CLEAR_ALL', 'All 15 timer slots cleared', profile?.device_id || kitId)
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>Timer Slots (15 max)</div>
        <button className={styles.clearBtn} onClick={clearAll} disabled={!connected}>
          Clear All
        </button>
      </div>

      <div className={styles.note}>
        Timer mode must be active for slots to trigger the pump.
        Switch to TIMER mode from the Control tab.
      </div>

      <div className={styles.table}>
        {/* Table header */}
        <div className={styles.tableHead}>
          <div>Slot</div>
          <div>Time (HH:MM)</div>
          <div>Duration (min)</div>
          <div>Enabled</div>
          <div>Save</div>
        </div>

        {slots.map((s, i) => (
          <div className={`${styles.row} ${s.enabled ? styles.rowEnabled : ''}`} key={i}>
            <div className={styles.slotNum}>{String(i + 1).padStart(2, '0')}</div>

            {/* TIME */}
            <div className={styles.timeCell}>
              <input
                type="number" min="0" max="23"
                value={s.hour}
                onChange={e => update(i, 'hour', e.target.value)}
                className={styles.timeInput}
                placeholder="HH"
              />
              <span className={styles.colon}>:</span>
              <input
                type="number" min="0" max="59"
                value={s.minute}
                onChange={e => update(i, 'minute', e.target.value)}
                className={styles.timeInput}
                placeholder="MM"
              />
            </div>

            {/* DURATION */}
            <div>
              <input
                type="number" min="1" max="480"
                value={s.duration}
                onChange={e => update(i, 'duration', e.target.value)}
                className={styles.durInput}
              />
            </div>

            {/* ENABLED TOGGLE */}
            <div>
              <button
                className={`${styles.toggle} ${s.enabled ? styles.toggleOn : styles.toggleOff}`}
                onClick={() => update(i, 'enabled', !s.enabled)}
              >
                {s.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* SAVE */}
            <div>
              <button
                className={`${styles.saveBtn} ${saved === i ? styles.saveBtnDone : ''}`}
                onClick={() => sendSlot(i)}
                disabled={!connected}
              >
                {saved === i ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
