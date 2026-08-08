import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import useMqtt from '../hooks/useMqtt'
import SensorCards from '../components/SensorCards'
import PumpControl from '../components/PumpControl'
import ThresholdControl from '../components/ThresholdControl'
import TimerSlots from '../components/TimerSlots'
import RtcSetter from '../components/RtcSetter'
import EventLog from '../components/EventLog'
import AlertBanner from '../components/AlertBanner'
import SensorChart from '../components/SensorChart'
import styles from './DashboardPage.module.css'

const TABS = ['Monitor', 'Control', 'Timers', 'Log']

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('Monitor')
  
  // Kit Management State
  const [kits, setKits] = useState([])
  const [selectedKitId, setSelectedKitId] = useState('')
  const [loadingKits, setLoadingKits] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    
    async function fetchKits() {
      const { data, error } = await supabase
        .from('kits')
        .select('*')
        .eq('owner_id', user.id)
      
      if (data && data.length > 0) {
        // Automatically rename the kit to "REVO IMS" permanently in the database
        if (data[0].id && data[0].name !== 'REVO IMS') {
          await supabase.from('kits').update({ name: 'REVO IMS' }).eq('id', data[0].id)
          data[0].name = 'REVO IMS'
        }
        
        setKits(data)
        setSelectedKitId(data[0].kit_id)
      }
      setLoadingKits(false)
    }
    fetchKits()

    // Subscribe to realtime updates so the Online/Offline badge updates instantly
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kits', filter: `owner_id=eq.${user.id}` },
        (payload) => {
          setKits(prev => prev.map(k => k.id === payload.new.id ? { ...k, ...payload.new } : k))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Initialize MQTT connection with the selected kit
  const mqtt = useMqtt(selectedKitId)

  if (loadingKits) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading your assigned kits...</p>
      </div>
    )
  }

  if (kits.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <h2>No Kits Assigned</h2>
        <p>You haven't been assigned any Smart Irrigation Kits yet.</p>
        <p>Please contact your administrator to assign a microcontroller to your account.</p>
      </div>
    )
  }

  return (
    <>
      {/* KIT SELECTOR */}
      <div className={styles.kitSelector}>
        <label>Active Kit:</label>
        {kits.length > 1 ? (
          <select 
            value={selectedKitId} 
            onChange={(e) => setSelectedKitId(e.target.value)}
            className={styles.kitDropdown}
          >
            {kits.map(k => (
              <option key={k.id} value={k.kit_id}>
                {(k.name === 'New Smart Kit' ? 'Revo IMS' : (k.name || k.kit_id))} ({mqtt.espStatus || k.status})
              </option>
            ))}
          </select>
        ) : (
          <span className={styles.singleKitName}>
            {(kits[0].name === 'New Smart Kit' ? 'Revo IMS' : (kits[0].name || kits[0].kit_id))}
            <span className={`${styles.kitBadge} ${mqtt.espStatus === 'ONLINE' ? styles.online : styles.offline}`}>
              {mqtt.espStatus || kits[0].status}
            </span>
          </span>
        )}
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
              kitId={selectedKitId}
              relayState={mqtt.relayState}
              mode={mqtt.mode}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={user}
              profile={profile}
            />
            <ThresholdControl
              kitId={selectedKitId}
              threshLow={mqtt.threshLow}
              threshHigh={mqtt.threshHigh}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={user}
              profile={profile}
            />
            <RtcSetter
              kitId={selectedKitId}
              publish={mqtt.publish}
              connected={mqtt.connected}
              user={user}
              profile={profile}
            />
          </div>
        )}

        {tab === 'Timers' && (
          <TimerSlots
            kitId={selectedKitId}
            timersJson={mqtt.timersJson}
            publish={mqtt.publish}
            connected={mqtt.connected}
            user={user}
            profile={profile}
          />
        )}

        {tab === 'Log' && (
          <EventLog logs={mqtt.logs} />
        )}
      </main>
    </>
  )
}
