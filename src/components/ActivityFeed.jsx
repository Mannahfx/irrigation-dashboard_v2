import styles from './ActivityFeed.module.css'

const ACTION_CONFIG = {
  LOGIN:           { icon: '🔑', color: '#a78bfa', label: 'Login' },
  LOGOUT:          { icon: '🚪', color: '#a78bfa', label: 'Logout' },
  PUMP_ON:         { icon: '▶',  color: '#ff7a00', label: 'Pump ON' },
  PUMP_OFF:        { icon: '⏹',  color: '#ef4444', label: 'Pump OFF' },
  PUMP_TOGGLE:     { icon: '⇄',  color: '#f59e0b', label: 'Pump Toggle' },
  MODE_CHANGE:     { icon: '⚙',  color: '#60a5fa', label: 'Mode Change' },
  THRESHOLD_SET:   { icon: '📊', color: '#22c55e', label: 'Threshold Set' },
  TIMER_SET:       { icon: '⏰', color: '#14b8a6', label: 'Timer Set' },
  TIMER_CLEAR_ALL: { icon: '🗑',  color: '#ef4444', label: 'Timers Cleared' },
  RTC_SET:         { icon: '🕐', color: '#8b5cf6', label: 'RTC Set' },
  FLOW_RESET:      { icon: '🔄', color: '#06b6d4', label: 'Flow Reset' },
}

export default function ActivityFeed({ activities, filterUserId }) {
  const filtered = filterUserId
    ? activities.filter(a => a.user_id === filterUserId)
    : activities

  if (filtered.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>Activity Feed</div>
        </div>
        <div className={styles.empty}>
          {filterUserId
            ? 'No activities for this user yet'
            : 'No activities recorded yet — actions will appear here in real time'
          }
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>Activity Feed</div>
        <div className={styles.count}>{filtered.length} events</div>
      </div>
      <div className={styles.feed}>
        {filtered.map((a, i) => {
          const cfg = ACTION_CONFIG[a.action] || { icon: '•', color: '#6b84a8', label: a.action }
          return (
            <div className={styles.entry} key={a.id || i} style={{ animationDelay: `${i * 30}ms` }}>
              <div className={styles.iconWrap} style={{ background: cfg.color + '18', borderColor: cfg.color + '40' }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
              </div>
              <div className={styles.content}>
                <div className={styles.entryTop}>
                  <span className={styles.actionBadge} style={{ background: cfg.color + '18', color: cfg.color, borderColor: cfg.color + '30' }}>
                    {cfg.label}
                  </span>
                  <span className={styles.entryEmail}>{a.user_email}</span>
                </div>
                {a.details && <div className={styles.details}>{a.details}</div>}
              </div>
              <div className={styles.entryTime}>
                {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
