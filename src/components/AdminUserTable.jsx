import { useState } from 'react'
import styles from './AdminUserTable.module.css'

export default function AdminUserTable({ users, selectedUserId, onSelectUser }) {
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>Clients ({users.length})</div>
        <input
          type="text"
          className={styles.search}
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Device</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {search ? 'No matching users' : 'No users found'}
                </td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr
                  key={u.id}
                  className={`${styles.row} ${selectedUserId === u.id ? styles.rowSelected : ''}`}
                  onClick={() => onSelectUser(selectedUserId === u.id ? null : u.id)}
                >
                  <td className={styles.nameCell}>
                    <div className={styles.avatar}>
                      {(u.display_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <span>{u.display_name || '—'}</span>
                  </td>
                  <td className={styles.emailCell}>{u.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.roleAdmin : styles.roleClient}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className={styles.mono}>{u.device_id || 'manna'}</td>
                  <td className={styles.timeCell}>
                    {u.last_login
                      ? new Date(u.last_login).toLocaleString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
