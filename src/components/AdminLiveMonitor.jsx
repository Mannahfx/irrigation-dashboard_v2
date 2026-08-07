import { useState } from 'react'
import useMqtt from '../hooks/useMqtt'
import SensorCards from '../components/SensorCards'
import PumpControl from '../components/PumpControl'
import ThresholdControl from '../components/ThresholdControl'
import TimerSlots from '../components/TimerSlots'
import RtcSetter from '../components/RtcSetter'
import EventLog from '../components/EventLog'
import AlertBanner from '../components/AlertBanner'
import SensorChart from '../components/SensorChart'
import styles from './AdminLiveMonitor.module.css'

const TABS = ['Monitor', 'Control', 'Timers', 'Log']

export default function AdminLiveMonitor({ kit, onBack }) {
  const mqtt = useMqtt(kit.kit_id)
  const [tab, setTab] = useState('Monitor')

  // Pass null for user to prevent invalid UUID errors in logActivity
  const adminUser = null
  const adminProfile = null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>&larr; Back to Kits</button>
        <div>
          <h2 className={styles.title}>Live Monitor: {kit.name || kit.kit_id}</h2>
          <p className={styles.subtitle}>ID: {kit.kit_id} &bull; Status: {kit.status}</p>
        </div>
      </div>

      {/* ALERT BANNER */}
      {mqtt.alerts.length > 0 && (
        <AlertBanner alerts={mqtt.alerts} />
      )}

      {/* FEEDBACK BAR */}
      {mqtt.feedback && (
        <div className={styles.feedbackBar}>
          <span className={styles.feedbackIcon}>↩</span>
          <span className={styles.feedbackText}>{mqtt.feedback.msg}</span>
          <span className={styles.feedbackTime}>{mqtt.feedback.ts}</span>
        </div>
      )}

      {/* TABS */}
      <nav className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <main className={styles.main}>
        {tab === 'Monitor' && (
          <div className={styles.monitorGrid}>
            <SensorCards sensors={mqtt.sensors} relayState={mqtt.relayState} mode={mqtt.mode} />
            <SensorChart tempHistory={mqtt.tempHistory} moistHistory={mqtt.moistHistory} />
          </div>
        )}

        {tab === 'Control' && (
          <div className={styles.controlGrid}>
            <PumpControl
              kitId={kit.kit_id}
              relayState={mqtt.relayState}
              mode={mqtt.mode}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={adminUser}
              profile={adminProfile}
            />
            <ThresholdControl
              kitId={kit.kit_id}
              threshLow={mqtt.threshLow}
              threshHigh={mqtt.threshHigh}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={adminUser}
              profile={adminProfile}
            />
            <RtcSetter
              kitId={kit.kit_id}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={adminUser}
              profile={adminProfile}
            />
          </div>
        )}

        {tab === 'Timers' && (
          <TimerSlots
            kitId={kit.kit_id}
            timersJson={mqtt.timersJson}
            publish={mqtt.publish}
            connected={mqtt.connected}
            user={adminUser}
            profile={adminProfile}
          />
        )}

        {tab === 'Log' && (
          <EventLog logs={mqtt.logs} />
        )}
      </main>
    </div>
  )
}
