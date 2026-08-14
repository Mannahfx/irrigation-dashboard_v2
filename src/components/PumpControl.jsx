import { useRef } from 'react'
import { logActivity } from '../lib/activityLogger'
import styles from './PumpControl.module.css'

const MODES = ['MANUAL', 'AUTO']

export default function PumpControl({ kitId, relayState, pumpState, fanState, mode, publish, connected, user, profile }) {
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
      const action = cmd === 'ON' ? 'VALVE_ON' : cmd === 'OFF' ? 'VALVE_OFF' : 'VALVE_TOGGLE'
      logActivity(user.id, user.email, action, `Valve ${cmd}`, profile?.device_id || kitId)
    }
  }

  function controlTankPump(cmd) {
    if (!kitId) return
    const now = Date.now()
    if (now - lastToggleRef.current < 500) return
    lastToggleRef.current = now

    publish(`${kitId}/relay/pump`, cmd)
    if (user) {
      const action = cmd === 'ON' ? 'PUMP_ON' : cmd === 'OFF' ? 'PUMP_OFF' : 'PUMP_TOGGLE'
      logActivity(user.id, user.email, action, `Tank Pump ${cmd}`, profile?.device_id || kitId)
    }
  }

  function controlFan(cmd) {
    if (!kitId) return
    const now = Date.now()
    if (now - lastToggleRef.current < 500) return
    lastToggleRef.current = now

    publish(`${kitId}/relay/fan`, cmd)
    if (user) {
      const action = cmd === 'ON' ? 'FAN_ON' : cmd === 'OFF' ? 'FAN_OFF' : 'FAN_TOGGLE'
      logActivity(user.id, user.email, action, `Cooling Fan ${cmd}`, profile?.device_id || kitId)
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
      <div className={styles.title}>Irrigation & Mode Control</div>

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

      {/* VALVE STATE */}
      <div className={styles.section}>
        <div className={styles.label}>Irrigation Valve</div>
        <div className={styles.pumpRow}>
          <div className={`${styles.pumpIndicator} ${relayState === 'ON' ? styles.pumpOn : styles.pumpOff}`}>
            <span className={styles.pumpDot} />
            {relayState}
          </div>
          {!isManual && (
            <div className={styles.autoNote}>
              Valve controlled by {mode} mode
            </div>
          )}
        </div>

        <div className={styles.switchWrapper}>
          <span className={styles.switchLabel}>Valve Power</span>
          <label className={`${styles.switch} ${(!connected || !isManual) ? styles.disabled : ''}`}>
            <input
              type="checkbox"
              checked={relayState === 'ON'}
              onChange={(e) => controlPump(e.target.checked ? 'ON' : 'OFF')}
              disabled={!connected || !isManual}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {/* TANK PUMP STATE */}
      <div className={styles.section}>
        <div className={styles.label}>Tank Filling Pump</div>
        <div className={styles.pumpRow}>
          <div className={`${styles.pumpIndicator} ${pumpState === 'ON' ? styles.pumpOn : styles.pumpOff}`}>
            <span className={styles.pumpDot} />
            {pumpState}
          </div>
          {!isManual && (
            <div className={styles.autoNote}>
              Valve controlled by {mode} mode
            </div>
          )}
        </div>

        <div className={styles.switchWrapper}>
            <span className={styles.switchLabel}>Valve Power</span>
          <label className={`${styles.switch} ${(!connected || !isManual) ? styles.disabled : ''}`}>
            <input
              type="checkbox"
              checked={pumpState === 'ON'}
              onChange={(e) => controlTankPump(e.target.checked ? 'ON' : 'OFF')}
              disabled={!connected || !isManual}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {/* FAN STATE */}
      <div className={styles.section}>
        <div className={styles.label}>Cooling Fan</div>
        <div className={styles.pumpRow}>
          <div className={`${styles.pumpIndicator} ${fanState === 'ON' ? styles.pumpOn : styles.pumpOff}`}>
            <span className={styles.pumpDot} />
            {fanState}
          </div>
          {!isManual && (
            <div className={styles.autoNote}>
              Fan controlled by {mode} mode
            </div>
          )}
        </div>

        <div className={styles.switchWrapper}>
          <span className={styles.switchLabel}>Fan Power</span>
          <label className={`${styles.switch} ${(!connected || !isManual) ? styles.disabled : ''}`}>
            <input
              type="checkbox"
              checked={fanState === 'ON'}
              onChange={(e) => controlFan(e.target.checked ? 'ON' : 'OFF')}
              disabled={!connected || !isManual}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
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
