import { useState } from 'react'
import { logActivity } from '../lib/activityLogger'
import styles from './RtcSetter.module.css'

export default function RtcSetter({ kitId, publish, connected, user, profile }) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')

  const [year,   setYear]   = useState(String(now.getFullYear()))
  const [month,  setMonth]  = useState(pad(now.getMonth() + 1))
  const [day,    setDay]    = useState(pad(now.getDate()))
  const [hour,   setHour]   = useState(pad(now.getHours()))
  const [minute, setMinute] = useState(pad(now.getMinutes()))
  const [second, setSecond] = useState(pad(now.getSeconds()))
  const [sent,   setSent]   = useState(false)

  function fillNow() {
    const n = new Date()
    setYear(String(n.getFullYear()))
    setMonth(pad(n.getMonth() + 1))
    setDay(pad(n.getDate()))
    setHour(pad(n.getHours()))
    setMinute(pad(n.getMinutes()))
    setSecond(pad(n.getSeconds()))
  }

  function send() {
    const payload = `${year},${month},${day},${hour},${minute},${second}`
    publish(`${kitId}/time/set`, payload)
    setSent(true)
    setTimeout(() => setSent(false), 2500)
    if (user) {
      logActivity(user.id, user.email, 'RTC_SET', `RTC time set to ${payload}`, profile?.device_id || kitId)
    }
  }

  function syncTime() {
    if (!kitId) return
    const n = new Date()
    const payload = JSON.stringify({
      year:   n.getFullYear(),
      month:  n.getMonth() + 1,
      day:    n.getDate(),
      hour:   n.getHours(),
      minute: n.getMinutes(),
      second: n.getSeconds(),
    })

    publish(`${kitId}/time/set`, payload)
    setSent(true)
    setTimeout(() => setSent(false), 2500)
    
    if (user) {
      logActivity(user.id, user.email, 'RTC_SYNC', 'Synced device time to local browser time', profile?.device_id || kitId)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>Set RTC Time (DS1307)</div>

      <div className={styles.note}>
        Format sent to ESP32: <span className={styles.mono}>YYYY,MM,DD,HH,MM,SS</span>
      </div>

      <div className={styles.fields}>
        {[
          { label: 'Year',   val: year,   set: setYear,   min: 2024, max: 2099, w: 72 },
          { label: 'Month',  val: month,  set: setMonth,  min: 1,    max: 12,   w: 56 },
          { label: 'Day',    val: day,    set: setDay,    min: 1,    max: 31,   w: 56 },
          { label: 'Hour',   val: hour,   set: setHour,   min: 0,    max: 23,   w: 56 },
          { label: 'Min',    val: minute, set: setMinute, min: 0,    max: 59,   w: 56 },
          { label: 'Sec',    val: second, set: setSecond, min: 0,    max: 59,   w: 56 },
        ].map(f => (
          <div className={styles.field} key={f.label}>
            <label className={styles.fieldLabel}>{f.label}</label>
            <input
              type="number"
              min={f.min} max={f.max}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className={styles.input}
              style={{ width: f.w }}
            />
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.nowBtn} onClick={fillNow}>
          ⟳ Use Current Time
        </button>
        <button
          className={`${styles.sendBtn} ${sent ? styles.sendBtnDone : ''}`}
          onClick={send}
          disabled={!connected}
        >
          {sent ? '✓ Time Set' : 'Set RTC Time'}
        </button>
      </div>
    </div>
  )
}
