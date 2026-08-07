import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'
import AdminLiveMonitor from './AdminLiveMonitor'
import styles from './AdminKitsManager.module.css'

export default function AdminKitsManager({ users }) {
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKitId, setNewKitId] = useState('')
  const [newKitName, setNewKitName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewingKit, setViewingKit] = useState(null)

  useEffect(() => {
    fetchKits()
  }, [])

  async function fetchKits() {
    setLoading(true)
    const { data, error } = await supabase
      .from('kits')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching kits:', error)
    } else {
      setKits(data || [])
    }
    setLoading(false)
  }

  async function handleAddKit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!newKitId.trim()) {
      setError('Kit ID is required')
      return
    }

    const { data, error } = await supabase
      .from('kits')
      .insert({
        kit_id: newKitId.trim(),
        name: newKitName.trim() || 'REVO IMS'
      })
      .select()

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Kit added successfully!')
      setNewKitId('')
      setNewKitName('')
      setKits([data[0], ...kits])
    }
  }

  async function handleAssignUser(kitId, userId) {
    const { error } = await supabase
      .from('kits')
      .update({ owner_id: userId || null })
      .eq('id', kitId)

    if (error) {
      alert('Failed to assign kit: ' + error.message)
    } else {
      setKits(kits.map(k => k.id === kitId ? { ...k, owner_id: userId || null } : k))
    }
  }

  async function handleDeleteKit(kitId) {
    if (!window.confirm('Are you sure you want to delete this kit?')) return

    const { error } = await supabase
      .from('kits')
      .delete()
      .eq('id', kitId)

    if (error) {
      alert('Failed to delete kit: ' + error.message)
    } else {
      setKits(kits.filter(k => k.id !== kitId))
      if (viewingKit?.id === kitId) setViewingKit(null)
    }
  }

  if (viewingKit) {
    return (
      <AdminLiveMonitor 
        kit={viewingKit} 
        onBack={() => setViewingKit(null)} 
      />
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Kits Management</h2>
        <p>Register new microcontrollers and assign them to clients</p>
      </div>

      <div className={styles.addForm}>
        <h3>Register New Kit</h3>
        <form onSubmit={handleAddKit} className={styles.formGroup}>
          <input
            type="text"
            placeholder="Kit ID (e.g. REVO-KIT-001)"
            value={newKitId}
            onChange={e => setNewKitId(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={newKitName}
            onChange={e => setNewKitName(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.btnPrimary}>Add Kit</button>
        </form>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
      </div>

      <div className={styles.list}>
        <h3>Registered Kits ({kits.length})</h3>
        
        {loading ? (
          <p>Loading kits...</p>
        ) : kits.length === 0 ? (
          <p className={styles.empty}>No kits registered yet.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Kit ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Assigned Client</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {kits.map(kit => (
                  <tr key={kit.id}>
                    <td className={styles.kitId}>{kit.kit_id}</td>
                    <td>{kit.name}</td>
                    <td>
                      <span className={`${styles.badge} ${kit.status === 'online' ? styles.badgeOnline : styles.badgeOffline}`}>
                        {kit.status}
                      </span>
                    </td>
                    <td>
                      <select 
                        className={styles.select}
                        value={kit.owner_id || ''}
                        onChange={(e) => handleAssignUser(kit.id, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {users.filter(u => u.role === 'client').map(u => (
                          <option key={u.id} value={u.id}>
                            {u.display_name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.btnMonitor}
                          onClick={() => setViewingKit(kit)}
                        >
                          Monitor Live
                        </button>
                        <button 
                          className={styles.btnDelete}
                          onClick={() => handleDeleteKit(kit.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
