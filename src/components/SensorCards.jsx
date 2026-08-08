import { Thermometer, Droplet, Leaf, Waves, GlassWater } from 'lucide-react'
import styles from './SensorCards.module.css'

function moistureColor(v) {
  if (v === null) return 'var(--muted)'
  if (v < 20)  return 'var(--red)'
  if (v < 50)  return 'var(--amber)'
  if (v < 80)  return 'var(--green)'
  return 'var(--blue)'
}

function tempColor(v) {
  if (v === null) return 'var(--muted)'
  if (v > 38) return 'var(--red)'
  if (v > 30) return 'var(--amber)'
  return 'var(--blue)'
}

export default function SensorCards({ sensors, relayState, mode }) {
  const m = sensors.moisture !== null ? parseFloat(sensors.moisture) : null

  const cards = [
    {
      label: 'Temperature',
      value: sensors.temperature ?? '--',
      unit: '°C',
      icon: <Thermometer size={24} />,
      color: tempColor(parseFloat(sensors.temperature)),
    },
    {
      label: 'Humidity',
      value: sensors.humidity ?? '--',
      unit: '%',
      icon: <Droplet size={24} />,
      color: 'var(--blue)',
    },
    {
      label: 'Soil Moisture',
      value: sensors.moisture ?? '--',
      unit: '%',
      icon: <Leaf size={24} />,
      color: moistureColor(m),
      bar: true,
      barVal: m,
    },
    {
      label: 'Tank State',
      value: sensors.tank ?? '--',
      unit: '',
      icon: <Waves size={24} />,
      color: sensors.tank === 'EMPTY' ? 'var(--red)' : (sensors.tank === 'FULL' ? 'var(--blue)' : 'var(--green)'),
    },
    {
      label: 'Total Flow',
      value: sensors.totalflow ?? '--',
      unit: 'L',
      icon: <GlassWater size={24} />,
      color: 'var(--green)',
    },
  ]

  return (
    <div>
      {/* Status row */}
      <div className={styles.statusRow}>
        <div className={`${styles.statusPill} ${relayState === 'ON' ? styles.pumpOn : styles.pumpOff}`}>
          <span className={styles.pillDot} />
          Pump {relayState}
        </div>
        <div className={styles.statusPill} style={{ borderColor: 'var(--green-dim)', color: 'var(--green)' }}>
          {mode} MODE
        </div>
      </div>

      {/* Cards */}
      <div className={styles.grid}>
        {cards.map(c => (
          <div className={styles.card} key={c.label}>
            <div className={styles.cardIcon}>{c.icon}</div>
            <div className={styles.cardLabel}>{c.label}</div>
            <div className={styles.cardValue} style={{ color: c.color }}>
              {c.value}
              <span className={styles.cardUnit}>{c.unit}</span>
            </div>
            {c.bar && c.barVal !== null && (
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.min(c.barVal, 100)}%`, background: c.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
