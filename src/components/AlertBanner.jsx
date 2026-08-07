import { useState } from 'react'
import styles from './AlertBanner.module.css'

export default function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || alerts.length === 0) return null

  const latest = alerts[0]

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>⚠</span>
      <div className={styles.content}>
        <div className={styles.msg}>{latest.msg}</div>
        <div className={styles.meta}>
          {latest.ts} · {alerts.length} alert{alerts.length > 1 ? 's' : ''} total
        </div>
      </div>
      <button className={styles.dismiss} onClick={() => setDismissed(true)}>✕</button>
    </div>
  )
}
