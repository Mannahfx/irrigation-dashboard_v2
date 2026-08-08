import { useRef } from 'react'
import { logActivity } from '../lib/activityLogger'
import styles from './PumpControl.module.css'

const MODES = ['MANUAL', 'AUTO', 'TIMER']

export default function PumpControl({ kitId, relayState, mode, publish, connected, user, profile }) {
  const isManual = mode === 'MANUAL'

  function changeMode(m) {
    if (!kitId) return
    publish(`${kitId}/mode/state`, m)
    if (user) {
      logActivity(user.id, user.email, 'MODE_CHANGE', `Mode changed to ${m}`, profile?.device_id || kitId)
    }
  }

  const lastToggleRef = useRef(0)

  function controlPump(cmd) {
    if (!kitId) return
    
    // Prevent mobile "ghost clicks" (double-firing) by throttling to 1 action per 500ms
    const now = Date.now()
    if (now - lastToggleRef.current < 500) return
    lastToggleRef.current = now

    publish(`${kitId}/relay/state`, cmd)
    if (user) {
      const action = cmd === 'ON' ? 'PUMP_ON' : cmd === 'OFF' ? 'PUMP_OFF' : 'PUMP_TOGGLE'
      logActivity(user.id, user.email, action, `Pump ${cmd}`, profile?.device_id || kitId)
    }
  }

  function resetFlow() {
    if (!kitId) return
    publish(`${kitId}/flowreset`, '1')
    if (user) {
      logActivity(user.id, user.email, 'FLOW_RESET', 'Flow counter reset', profile?.device_id || kitId)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>Pump & Mode Control</div>

      {/* MODE SELECTOR */}
      <div className={styles.section}>
        <div className={styles.label}>Operating Mode</div>
        <div className={styles.modeRow}>
          {MODES.map(m => (
            <button
              key={m}
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => changeMode(m)}
              disabled={!connected}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* PUMP STATE */}
      <div className={styles.section}>
        <div className={styles.label}>Water Pump</div>
        <div className={styles.pumpRow}>
          <div className={`${styles.pumpIndicator} ${relayState === 'ON' ? styles.pumpOn : styles.pumpOff}`}>
            <span className={styles.pumpDot} />
            {relayState}
          </div>
          {!isManual && (
            <div className={styles.autoNote}>
              Pump controlled by {mode} mode
            </div>
          )}
        </div>

        {isManual && (
          <div className={styles.switchWrapper}>
            <span className={styles.switchLabel}>Pump Power</span>
            <label className={`${styles.switch} ${!connected ? styles.disabled : ''}`}>
              <input
                type="checkbox"
                checked={relayState === 'ON'}
                onChange={(e) => controlPump(e.target.checked ? 'ON' : 'OFF')}
                disabled={!connected}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        )}
      </div>

      {/* FLOW RESET */}
      <div className={styles.section}>
        <button
          className={styles.resetBtn}
          onClick={resetFlow}
          disabled={!connected}
        >
          Reset Flow Counter
        </button>
      </div>
    </div>
  )
}
