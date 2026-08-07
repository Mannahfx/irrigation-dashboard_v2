import styles from './EventLog.module.css'

export default function EventLog({ logs }) {
  if (logs.length === 0) {
    return (
      <div className={styles.empty}>
        No events yet — log entries appear here as the system runs
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>Event Log</div>
        <div className={styles.count}>{logs.length} entries</div>
      </div>
      <div className={styles.log}>
        {logs.map((l, i) => (
          <div className={styles.entry} key={i}>
            <span className={styles.ts}>{l.ts}</span>
            <span className={styles.msg}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
