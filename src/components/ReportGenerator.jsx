import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'
import styles from './ReportGenerator.module.css'

export default function ReportGenerator({ kitId, kitName }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  async function fetchSnapshots() {
    if (!kitId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('kit_id', kitId)
      .gte('recorded_at', `${startDate}T00:00:00`)
      .lte('recorded_at', `${endDate}T23:59:59`)
      .order('recorded_at', { ascending: true })

    if (data) setSnapshots(data)
    if (error) console.error('Snapshot fetch error:', error)
    setLoading(false)
  }

  useEffect(() => { fetchSnapshots() }, [kitId, startDate, endDate])

  function getSummary() {
    if (snapshots.length === 0) return null
    const temps = snapshots.filter(s => s.temperature != null).map(s => s.temperature)
    const hums = snapshots.filter(s => s.humidity != null).map(s => s.humidity)
    const moists = snapshots.filter(s => s.moisture != null).map(s => s.moisture)
    const flows = snapshots.filter(s => s.total_flow != null).map(s => s.total_flow)
    const uniqueDays = new Set(snapshots.map(s => new Date(s.recorded_at).toDateString())).size

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 'N/A'
    const maxFlow = flows.length ? Math.max(...flows).toFixed(1) : 'N/A'

    const tankCounts = {}
    snapshots.forEach(s => {
      if (s.tank_state) tankCounts[s.tank_state] = (tankCounts[s.tank_state] || 0) + 1
    })
    const topTank = Object.entries(tankCounts).sort((a, b) => b[1] - a[1])[0]
    const topTankPct = topTank ? Math.round((topTank[1] / snapshots.length) * 100) : 0

    return {
      avgTemp: avg(temps),
      avgHum: avg(hums),
      avgMoist: avg(moists),
      maxFlow,
      days: uniqueDays,
      totalReadings: snapshots.length,
      topTankState: topTank ? `${topTank[0]} (${topTankPct}%)` : 'N/A',
    }
  }

  function downloadCSV() {
    if (snapshots.length === 0) return
    const headers = ['Date', 'Time', 'Temperature (°C)', 'Humidity (%)', 'Moisture (%)', 'Tank State', 'Flow Rate (L/min)', 'Total Flow (L)', 'Valve', 'Pump', 'Fan', 'Mode']
    const rows = snapshots.map(s => {
      const d = new Date(s.recorded_at)
      return [
        d.toLocaleDateString(), d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        s.temperature ?? '', s.humidity ?? '', s.moisture ?? '', s.tank_state ?? '',
        s.flow_rate ?? '', s.total_flow ?? '', s.valve_state ?? '', s.pump_state ?? '',
        s.fan_state ?? '', s.mode ?? ''
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${kitId}_report_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPDF() {
    if (snapshots.length === 0) return
    const summary = getSummary()
    const tableRows = snapshots.map(s => {
      const d = new Date(s.recorded_at)
      return `<tr>
        <td>${d.toLocaleDateString()}</td>
        <td>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${s.temperature ?? '-'}</td>
        <td>${s.humidity ?? '-'}</td>
        <td>${s.moisture ?? '-'}</td>
        <td>${s.tank_state ?? '-'}</td>
        <td>${s.total_flow ?? '-'}</td>
        <td>${s.valve_state ?? '-'}</td>
        <td>${s.mode ?? '-'}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><title>Revo IMS Report</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:30px;color:#222;font-size:12px}
      h1{color:#1a5c3a;font-size:20px;margin:0}h2{color:#1a5c3a;font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px}
      .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1a5c3a;padding-bottom:15px}
      .meta{display:flex;justify-content:space-between;margin:10px 0 20px}
      .meta-item{font-size:12px}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#1a5c3a;color:#fff}
      tr:nth-child(even){background:#f5f5f5}
      .summary{background:#f0f7f0;border:1px solid #1a5c3a;border-radius:5px;padding:15px;margin:20px 0}
      .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .summary-item{text-align:center}.summary-item .val{font-size:18px;font-weight:bold;color:#1a5c3a}
      .summary-item .label{font-size:10px;color:#666}
      .footer{text-align:center;color:#999;font-size:10px;margin-top:30px;border-top:1px solid #eee;padding-top:10px}
    </style></head><body>
    <div class="header">
      <h1>REVOSMART INTEGRATED SERVICES</h1>
      <p>Revo IMS — Client Usage Report</p>
    </div>
    <div class="meta">
      <div class="meta-item"><strong>Kit ID:</strong> ${kitId}</div>
      <div class="meta-item"><strong>Kit Name:</strong> ${kitName || kitId}</div>
      <div class="meta-item"><strong>Period:</strong> ${startDate} to ${endDate}</div>
      <div class="meta-item"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="summary">
      <h2>Monthly Summary</h2>
      <div class="summary-grid">
        <div class="summary-item"><div class="val">${summary?.avgTemp || 'N/A'}°C</div><div class="label">Avg Temperature</div></div>
        <div class="summary-item"><div class="val">${summary?.avgHum || 'N/A'}%</div><div class="label">Avg Humidity</div></div>
        <div class="summary-item"><div class="val">${summary?.avgMoist || 'N/A'}%</div><div class="label">Avg Moisture</div></div>
        <div class="summary-item"><div class="val">${summary?.maxFlow || 'N/A'}L</div><div class="label">Max Water Used</div></div>
        <div class="summary-item"><div class="val">${summary?.days || 0}</div><div class="label">Days Active</div></div>
        <div class="summary-item"><div class="val">${summary?.topTankState || 'N/A'}</div><div class="label">Most Common Tank State</div></div>
      </div>
    </div>
    <h2>Detailed Readings (${summary?.totalReadings || 0} records)</h2>
    <table>
      <thead><tr><th>Date</th><th>Time</th><th>Temp °C</th><th>Humidity %</th><th>Moisture %</th><th>Tank</th><th>Water (L)</th><th>Valve</th><th>Mode</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">This report was generated automatically by the Revo IMS Dashboard. © RevoSmart Integrated Services ${new Date().getFullYear()}</div>
    </body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const summary = getSummary()

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📊 Usage Reports</h2>
      <p className={styles.subtitle}>Generate and download sensor data reports for this kit</p>

      <div className={styles.controls}>
        <div className={styles.dateGroup}>
          <label>From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateGroup}>
          <label>To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
        </div>
        <button onClick={fetchSnapshots} className={styles.refreshBtn}>🔄 Refresh</button>
      </div>

      {summary && (
        <div className={styles.summaryCard}>
          <h3>Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.avgTemp}°C</span><span className={styles.label}>Avg Temp</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.avgHum}%</span><span className={styles.label}>Avg Humidity</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.avgMoist}%</span><span className={styles.label}>Avg Moisture</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.maxFlow}L</span><span className={styles.label}>Max Water</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.days}</span><span className={styles.label}>Days Active</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.totalReadings}</span><span className={styles.label}>Readings</span></div>
          </div>
        </div>
      )}

      <div className={styles.downloadBar}>
        <button onClick={downloadCSV} disabled={snapshots.length === 0} className={styles.downloadBtn}>📥 Download CSV</button>
        <button onClick={downloadPDF} disabled={snapshots.length === 0} className={`${styles.downloadBtn} ${styles.pdfBtn}`}>📄 Download PDF</button>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Loading snapshots...</p>
      ) : snapshots.length === 0 ? (
        <p className={styles.emptyText}>No data recorded for this period yet. Snapshots are captured every 2 hours from 8AM to 6PM.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Temp °C</th>
                <th>Hum %</th>
                <th>Moist %</th>
                <th>Tank</th>
                <th>Flow L</th>
                <th>Valve</th>
                <th>Pump</th>
                <th>Fan</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(s => {
                const d = new Date(s.recorded_at)
                return (
                  <tr key={s.id}>
                    <td>{d.toLocaleDateString()}</td>
                    <td>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{s.temperature ?? '-'}</td>
                    <td>{s.humidity ?? '-'}</td>
                    <td>{s.moisture ?? '-'}</td>
                    <td>{s.tank_state ?? '-'}</td>
                    <td>{s.total_flow ?? '-'}</td>
                    <td>{s.valve_state ?? '-'}</td>
                    <td>{s.pump_state ?? '-'}</td>
                    <td>{s.fan_state ?? '-'}</td>
                    <td>{s.mode ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
