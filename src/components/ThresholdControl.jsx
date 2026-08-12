import { useState, useEffect } from 'react'
import { logActivity } from '../lib/activityLogger'
import styles from './ThresholdControl.module.css'

export default function ThresholdControl({ kitId, threshLow, threshHigh, fanTempOn, fanTempOff, fanHumOn, fanHumOff, publish, connected, user, profile }) {
  const [low,  setLow]  = useState(threshLow || '10')
  const [high, setHigh] = useState(threshHigh || '60')
  const [fTempOn, setFTempOn] = useState(fanTempOn || '30')
  const [fTempOff, setFTempOff] = useState(fanTempOff || '20')
  const [err,  setErr]  = useState('')

  useEffect(() => {
    if (threshLow) setLow(threshLow)
    if (threshHigh) setHigh(threshHigh)
    if (fanTempOn) setFTempOn(fanTempOn)
    if (fanTempOff) setFTempOff(fanTempOff)
  }, [threshLow, threshHigh, fanTempOn, fanTempOff])

  function apply() {
    if (!kitId) return

    const lo = parseInt(low)
    const hi = parseInt(high)
    const tOn = parseInt(fTempOn)
    const tOff = parseInt(fTempOff)
    
    if (isNaN(lo) || isNaN(hi)) { setErr('Enter valid moisture numbers'); return }
    if (isNaN(tOn) || isNaN(tOff)) { setErr('Enter valid fan numbers'); return }
    
    if (lo < 1 || lo > 94)      { setErr('Moisture Low must be 1–94');    return }
    if (hi < 2 || hi > 95)      { setErr('Moisture High must be 2–95');   return }
    if (lo >= hi)               { setErr('Moisture Low must be < High'); return }
    
    if (tOff >= tOn)            { setErr('Fan Temp OFF must be < ON'); return }

    setErr('')
    
    // Publish separately to dynamic kit topics
    publish(`${kitId}/threshold/low`,  String(lo))
    publish(`${kitId}/threshold/high`, String(hi))
    publish(`${kitId}/threshold/temp_on`, String(tOn))
    publish(`${kitId}/threshold/temp_off`, String(tOff))
    
    if (user) {
      logActivity(user.id, user.email, 'THRESHOLD_SET', `Thresholds updated`, profile?.device_id || kitId)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>Moisture Thresholds</div>

      <div className={styles.current}>
        Current: <span className={styles.currentVal}>Low: {threshLow}% | High: {threshHigh}%</span>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} style={{ color: 'var(--red)' }}>
            Valve ON at or below
          </label>
          <div className={styles.inputWrap}>
            <input
              type="number" min="1" max="94"
              value={low}
              onChange={e => setLow(e.target.value)}
              className={styles.input}
              style={{ borderColor: 'var(--red)44' }}
            />
            <span className={styles.unit}>%</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} style={{ color: 'var(--green)' }}>
            Valve OFF at or above
          </label>
          <div className={styles.inputWrap}>
            <input
              type="number" min="2" max="95"
              value={high}
              onChange={e => setHigh(e.target.value)}
              className={styles.input}
              style={{ borderColor: 'var(--green)44' }}
            />
            <span className={styles.unit}>%</span>
          </div>
        </div>
      </div>

      {err && <div className={styles.err}>{err}</div>}

      <div className={styles.title} style={{ marginTop: '20px' }}>Cooling Fan Settings</div>
      <div className={styles.current}>
        Current Temp: <span className={styles.currentVal}>ON: {fanTempOn}{"\u00B0"}C | OFF: {fanTempOff}{"\u00B0"}C</span>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Temp ON</label>
          <div className={styles.inputWrap}>
            <input type="number" value={fTempOn} onChange={e => setFTempOn(e.target.value)} className={styles.input} />
            <span className={styles.unit}>{"\u00B0"}C</span>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Temp OFF</label>
          <div className={styles.inputWrap}>
            <input type="number" value={fTempOff} onChange={e => setFTempOff(e.target.value)} className={styles.input} />
            <span className={styles.unit}>{"\u00B0"}C</span>
          </div>
        </div>
      </div>

      {err && <div className={styles.err}>{err}</div>}
      <button
        className={styles.applyBtn}
        onClick={apply}
        disabled={!connected}
      >
        Apply Thresholds
      </button>
    </div>
  )
}
