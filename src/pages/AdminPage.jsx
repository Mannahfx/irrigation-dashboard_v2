import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import AdminUserTable from '../components/AdminUserTable'
import ActivityFeed from '../components/ActivityFeed'
import AdminKitsManager from '../components/AdminKitsManager'
import styles from './AdminPage.module.css'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  const [activeTab, setActiveTab] = useState('clients') // 'clients' or 'kits'

  // Fetch all user profiles
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) setUsers(data)
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  // Fetch activities + subscribe to realtime
  useEffect(() => {
    async function fetchActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) setActivities(data)
      setLoadingActivities(false)
    }
    fetchActivities()

    // Real-time subscription for new activities
    const channel = supabase
      .channel('admin-activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          setActivities(prev => [payload.new, ...prev].slice(0, 200))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Compute stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const activeToday = users.filter(u =>
    u.last_login && new Date(u.last_login) >= todayStart
  ).length
  const actionsToday = activities.filter(a =>
    new Date(a.created_at) >= todayStart
  ).length
  const latestAction = activities.length > 0 ? activities[0] : null

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin Dashboard</h1>
        <p className={styles.pageSub}>Monitor all client activities and manage hardware</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'clients' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          Clients & Activity
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'kits' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('kits')}
        >
          Smart Kits Management
        </button>
      </div>

      {activeTab === 'clients' ? (
        <>
          {/* Stats bar */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{users.length}</div>
              <div className={styles.statLabel}>Total Clients</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{activeToday}</div>
              <div className={styles.statLabel}>Active Today</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{actionsToday}</div>
              <div className={styles.statLabel}>Actions Today</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue + ' ' + styles.statSmall}>
                {latestAction
                  ? new Date(latestAction.created_at).toLocaleTimeString()
                  : '—'
                }
              </div>
              <div className={styles.statLabel}>Last Activity</div>
            </div>
          </div>

          {/* Main content */}
          <div className={styles.grid}>
            <div className={styles.tableArea}>
              {loadingUsers ? (
                <div className={styles.loading}>Loading users...</div>
              ) : (
                <AdminUserTable
                  users={users}
                  selectedUserId={selectedUserId}
                  onSelectUser={setSelectedUserId}
                />
              )}
            </div>

            <div className={styles.feedArea}>
              {loadingActivities ? (
                <div className={styles.loading}>Loading activities...</div>
              ) : (
                <ActivityFeed
                  activities={activities}
                  filterUserId={selectedUserId}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <AdminKitsManager users={users} />
      )}
    </div>
  )
}
