import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import supabase from '../lib/supabase'
import { FileText, RefreshCw, FileSpreadsheet, File as FileIcon, PlusCircle } from 'lucide-react'
import styles from './ReportGenerator.module.css'

// ── Formatting helpers ──
const toLocalISODate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const fmt = (v, dp = 1) => (v == null || Number.isNaN(Number(v)) ? '-' : Number(v).toFixed(dp))
const escapeHtml = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`

// Water used column: first metered reading with nothing before it is the "Opening" entry
const usedLabel = e => (e.used == null ? (e.total_flow != null ? 'Opening' : '-') : fmt(e.used))

// Turn one recorded reading into a plain-English statement line
function describeReading(r, meterReset) {
  const parts = [r.valve_state === 'ON' ? 'Irrigation valve ON' : 'Irrigation valve OFF']
  if (r.tank_state) parts.push(`tank ${r.tank_state.toLowerCase()}`)
  if (r.pump_state === 'ON') parts.push('pump refilling tank')
  if (r.fan_state === 'ON') parts.push('cooling fan ON')
  if (r.mode) parts.push(`${r.mode.toLowerCase()} mode`)
  if (meterReset) parts.push('flow meter was reset')
  return parts.join(', ')
}

// Build bank-statement style entries.
// "Water used" = increase in the kit's flow meter since the previous reading.
// If the meter went down, it was reset to 0, so the new reading itself is the water used since the reset.
function buildStatement(rows, openingRow) {
  let prevMeter = openingRow?.total_flow ?? null
  const openingMeter = prevMeter ?? rows.find(r => r.total_flow != null)?.total_flow ?? null
  const days = []
  let totalUsed = 0

  rows.forEach(r => {
    const date = new Date(r.recorded_at)
    const meter = r.total_flow
    let used = null
    let reset = false
    if (meter != null && prevMeter != null) {
      used = meter - prevMeter
      if (used < 0) { used = meter; reset = true }
    }
    if (meter != null) prevMeter = meter
    if (used != null) totalUsed += used

    const key = toLocalISODate(date)
    let day = days[days.length - 1]
    if (!day || day.key !== key) {
      day = { key, date, entries: [], total: 0 }
      days.push(day)
    }
    day.entries.push({ ...r, date, used, description: describeReading(r, reset) })
    day.total += used ?? 0
  })

  const peakDay = days.reduce((best, d) => (!best || d.total > best.total ? d : best), null)
  const avg = key => {
    const vals = rows.map(r => r[key]).filter(v => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  return {
    days,
    summary: {
      totalUsed,
      openingMeter,
      closingMeter: prevMeter,
      daysRecorded: days.length,
      avgPerDay: days.length ? totalUsed / days.length : null,
      peakDay,
      readings: rows.length,
      avgTemp: avg('temperature'),
      avgHum: avg('humidity'),
      avgMoist: avg('moisture'),
    },
  }
}

export default function ReportGenerator({ kitId, kitName, mqtt }) {
  const [rows, setRows] = useState([])
  const [openingRow, setOpeningRow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return toLocalISODate(d)
  })
  const [endDate, setEndDate] = useState(() => toLocalISODate(new Date()))

  const fetchStatement = useCallback(async () => {
    if (!kitId) return
    setLoading(true)
    setError('')

    // Use local-time day boundaries so 8AM–6PM readings land on the right day
    const from = new Date(`${startDate}T00:00:00`).toISOString()
    const to = new Date(`${endDate}T23:59:59.999`).toISOString()

    const [periodRes, openingRes] = await Promise.all([
      supabase
        .from('sensor_snapshots')
        .select('*')
        .eq('kit_id', kitId)
        .gte('recorded_at', from)
        .lte('recorded_at', to)
        .order('recorded_at', { ascending: true }),
      // Last meter reading before the period starts, so the first entry's usage can be calculated
      supabase
        .from('sensor_snapshots')
        .select('*')
        .eq('kit_id', kitId)
        .lt('recorded_at', from)
        .not('total_flow', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1),
    ])

    if (periodRes.error) {
      console.error('Statement fetch error:', periodRes.error)
      setError(
        periodRes.error.code === 'PGRST205'
          ? 'The readings table has not been created in Supabase yet. Run supabase-snapshots.sql in the Supabase SQL Editor.'
          : `Could not load readings: ${periodRes.error.message}`
      )
      setRows([])
    } else {
      setRows(periodRes.data || [])
    }
    setOpeningRow(openingRes.data?.[0] || null)
    setLoading(false)
  }, [kitId, startDate, endDate])

  useEffect(() => { fetchStatement() }, [fetchStatement])

  async function captureManualSnapshot() {
    if (!mqtt || !mqtt.sensors) {
      setError("Waiting for live kit data to connect. Please make sure the kit is online.")
      return
    }

    setCapturing(true)
    setError('')
    
    const s = mqtt.sensors
    if (s.temperature == null && s.humidity == null && s.moisture == null && s.totalflow == null) {
      setError("No sensor readings received from kit yet. Please wait a moment.")
      setCapturing(false)
      return
    }

    const { error: insertError } = await supabase.from('sensor_snapshots').insert({
      kit_id: kitId,
      recorded_at: new Date().toISOString(),
      temperature: s.temperature ? parseFloat(s.temperature) : null,
      humidity: s.humidity ? parseFloat(s.humidity) : null,
      moisture: s.moisture ? parseFloat(s.moisture) : null,
      tank_state: s.tank || null,
      flow_rate: s.flowrate ? parseFloat(s.flowrate) : null,
      total_flow: s.totalflow ? parseFloat(s.totalflow) : null,
      valve_state: mqtt.relayState,
      pump_state: mqtt.pumpState,
      fan_state: mqtt.fanState,
      mode: mqtt.mode,
    })

    if (insertError) {
      setError(`Could not capture reading: ${insertError.message}`)
    } else {
      // Reload table to show the new snapshot!
      fetchStatement()
    }
    setCapturing(false)
  }

  const { days, summary } = useMemo(() => buildStatement(rows, openingRow), [rows, openingRow])
  const hasData = rows.length > 0
  const displayName = kitName || kitId
  const periodLabel = `${fmtDate(new Date(`${startDate}T00:00:00`))} to ${fmtDate(new Date(`${endDate}T00:00:00`))}`
  const fileBase = `${kitId}_water_statement_${startDate}_to_${endDate}`

  function downloadCSV() {
    if (!hasData) return
    const lines = [
      ['Statement of Water Usage'],
      ['RevoSmart Integrated Services'],
      ['Kit ID', kitId],
      ['Kit Name', displayName],
      ['Period', periodLabel],
      ['Generated', fmtDate(new Date())],
      ['Opening Meter (L)', fmt(summary.openingMeter)],
      ['Total Water Used (L)', fmt(summary.totalUsed)],
      ['Closing Meter (L)', fmt(summary.closingMeter)],
      [],
      ['Date', 'Time', 'Description', 'Water Used (L)', 'Meter Reading (L)', 'Temperature (°C)', 'Humidity (%)', 'Soil Moisture (%)'],
    ]
    days.forEach(day => {
      day.entries.forEach(e =>
        lines.push([
          fmtDate(e.date), fmtTime(e.date), e.description, usedLabel(e),
          fmt(e.total_flow), fmt(e.temperature), fmt(e.humidity), fmt(e.moisture),
        ])
      )
      lines.push(['', '', `Daily total for ${fmtDate(day.date)}`, fmt(day.total), '', '', '', ''])
    })

    // BOM so Excel shows the ° symbol correctly
    const csv = '\uFEFF' + lines.map(l => l.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBase}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPDF() {
    if (!hasData) return
    const tableBody = days.map(day =>
      day.entries.map(e => `<tr>
          <td>${fmtDate(e.date)}</td>
          <td>${fmtTime(e.date)}</td>
          <td class="desc">${escapeHtml(e.description)}</td>
          <td class="num used">${usedLabel(e)}</td>
          <td class="num">${fmt(e.total_flow)}</td>
          <td class="num">${fmt(e.temperature)}</td>
          <td class="num">${fmt(e.humidity)}</td>
          <td class="num">${fmt(e.moisture)}</td>
        </tr>`).join('') +
      `<tr class="day-total">
          <td colspan="3">Daily total for ${fmtDate(day.date)}</td>
          <td class="num">${fmt(day.total)}</td>
          <td colspan="4"></td>
        </tr>`
    ).join('')

    const peak = summary.peakDay
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(fileBase)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; font-size: 11px; margin: 0; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a5c3a; padding-bottom: 12px; }
      .brand h1 { color: #1a5c3a; font-size: 18px; margin: 0; }
      .brand p { margin: 2px 0 0; color: #555; }
      .doc-title { text-align: right; }
      .doc-title h2 { margin: 0; font-size: 16px; letter-spacing: 1px; color: #1a5c3a; }
      .doc-title p { margin: 2px 0 0; color: #555; }
      .account { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 14px 0; }
      .account div { padding: 3px 0; border-bottom: 1px dotted #ccc; }
      .account strong { display: inline-block; width: 90px; color: #555; font-weight: 600; }
      .balances { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #1a5c3a; border-radius: 4px; margin: 12px 0 6px; }
      .balances div { padding: 10px; text-align: center; border-right: 1px solid #cfe3d6; }
      .balances div:last-child { border-right: none; }
      .balances .v { font-size: 16px; font-weight: 700; color: #1a5c3a; }
      .balances .l { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
      .balances .main { background: #eaf4ee; }
      .extra { color: #555; margin: 6px 0 14px; }
      table { width: 100%; border-collapse: collapse; }
      thead { display: table-header-group; }
      th { background: #1a5c3a; color: #fff; text-align: left; padding: 6px; font-size: 10px; }
      td { padding: 5px 6px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
      tr { page-break-inside: avoid; }
      .num { text-align: right; white-space: nowrap; }
      th.num { text-align: right; }
      .desc { color: #333; }
      .used { font-weight: 600; }
      .day-total td { background: #eaf4ee; font-weight: 700; color: #1a5c3a; border-bottom: 2px solid #1a5c3a; }
      .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #ddd; color: #888; font-size: 9px; text-align: center; }
    </style></head><body>
      <div class="top">
        <div class="brand">
          <h1>REVOSMART INTEGRATED SERVICES</h1>
          <p>Revo IMS Smart Irrigation</p>
        </div>
        <div class="doc-title">
          <h2>STATEMENT OF WATER USAGE</h2>
          <p>Generated ${fmtDate(new Date())}</p>
        </div>
      </div>

      <div class="account">
        <div><strong>Kit Name:</strong> ${escapeHtml(displayName)}</div>
        <div><strong>Period:</strong> ${periodLabel}</div>
        <div><strong>Kit ID:</strong> ${escapeHtml(kitId)}</div>
        <div><strong>Readings:</strong> ${summary.readings} over ${summary.daysRecorded} day(s)</div>
      </div>

      <div class="balances">
        <div><div class="v">${fmt(summary.openingMeter)} L</div><div class="l">Opening Meter Reading</div></div>
        <div class="main"><div class="v">${fmt(summary.totalUsed)} L</div><div class="l">Total Water Used</div></div>
        <div><div class="v">${fmt(summary.closingMeter)} L</div><div class="l">Closing Meter Reading</div></div>
      </div>
      <p class="extra">
        Average per day: <b>${fmt(summary.avgPerDay)} L</b>
        ${peak ? ` &nbsp;|&nbsp; Highest day: <b>${fmt(peak.total)} L</b> on ${fmtDate(peak.date)}` : ''}
        &nbsp;|&nbsp; Average conditions: ${fmt(summary.avgTemp)}°C, ${fmt(summary.avgHum)}% humidity, ${fmt(summary.avgMoist)}% soil moisture
      </p>

      <table>
        <thead><tr>
          <th>Date</th><th>Time</th><th>Description</th>
          <th class="num">Water Used (L)</th><th class="num">Meter (L)</th>
          <th class="num">Temp °C</th><th class="num">Hum %</th><th class="num">Moist %</th>
        </tr></thead>
        <tbody>${tableBody}</tbody>
      </table>

      <div class="footer">
        Water used is the amount recorded by the kit's flow meter since the previous reading. Readings are taken every 2 hours from 8AM to 6PM.<br/>
        This statement was generated automatically by the Revo IMS Dashboard. &copy; RevoSmart Integrated Services ${new Date().getFullYear()}
      </div>
    </body></html>`

    const w = window.open('', '_blank')
    if (!w) {
      alert('Please allow pop-ups for this site to download the PDF statement.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <FileText size={24} /> Statement of Water Usage
      </h2>
      <p className={styles.subtitle}>
        Readings are recorded every 2 hours from 8AM to 6PM. Water used is the amount that flowed since the previous reading.
      </p>

      <div className={styles.controls}>
        <div className={styles.dateGroup}>
          <label>From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateGroup}>
          <label>To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
        </div>
        <button onClick={fetchStatement} className={styles.refreshBtn}>
          <RefreshCw size={16} /> Refresh
        </button>
        <button onClick={captureManualSnapshot} disabled={capturing} className={`${styles.refreshBtn} ${styles.captureBtn}`}>
          <PlusCircle size={16} /> {capturing ? 'Recording...' : 'Record Snapshot Now'}
        </button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {hasData && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <div>
              <span className={styles.label}>Kit</span>
              <strong>{displayName}</strong> <span className={styles.kitId}>({kitId})</span>
            </div>
            <div>
              <span className={styles.label}>Period</span>
              <strong>{periodLabel}</strong>
            </div>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span className={styles.val}>{fmt(summary.openingMeter)} L</span><span className={styles.label}>Opening Meter</span></div>
            <div className={`${styles.summaryItem} ${styles.highlight}`}><span className={styles.val}>{fmt(summary.totalUsed)} L</span><span className={styles.label}>Total Water Used</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{fmt(summary.closingMeter)} L</span><span className={styles.label}>Closing Meter</span></div>
            <div className={styles.summaryItem}><span className={styles.val}>{fmt(summary.avgPerDay)} L</span><span className={styles.label}>Average per Day</span></div>
            <div className={styles.summaryItem}>
              <span className={styles.val}>{summary.peakDay ? `${fmt(summary.peakDay.total)} L` : '-'}</span>
              <span className={styles.label}>Highest Day{summary.peakDay ? ` (${fmtDate(summary.peakDay.date)})` : ''}</span>
            </div>
            <div className={styles.summaryItem}><span className={styles.val}>{summary.daysRecorded}</span><span className={styles.label}>Days Recorded</span></div>
          </div>
          <p className={styles.conditions}>
            Average conditions: {fmt(summary.avgTemp)}°C, {fmt(summary.avgHum)}% humidity, {fmt(summary.avgMoist)}% soil moisture
          </p>
        </div>
      )}

      <div className={styles.downloadBar}>
        <button onClick={downloadCSV} disabled={!hasData} className={styles.downloadBtn}>
          <FileSpreadsheet size={16} /> Download CSV
        </button>
        <button onClick={downloadPDF} disabled={!hasData} className={`${styles.downloadBtn} ${styles.pdfBtn}`}>
          <FileIcon size={16} /> Download PDF
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Loading statement...</p>
      ) : !hasData ? (
        !error && (
          <p className={styles.emptyText}>
            No readings recorded for this period yet. Click "Record Snapshot Now" to save the live kit data.
          </p>
        )
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Description</th>
                <th className={styles.num}>Water Used (L)</th>
                <th className={styles.num}>Meter (L)</th>
                <th className={styles.num}>Temp °C</th>
                <th className={styles.num}>Hum %</th>
                <th className={styles.num}>Moist %</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <Fragment key={day.key}>
                  {day.entries.map(e => (
                    <tr key={e.id}>
                      <td>{fmtDate(e.date)}</td>
                      <td>{fmtTime(e.date)}</td>
                      <td className={styles.desc}>{e.description}</td>
                      <td className={`${styles.num} ${styles.used}`}>{usedLabel(e)}</td>
                      <td className={styles.num}>{fmt(e.total_flow)}</td>
                      <td className={styles.num}>{fmt(e.temperature)}</td>
                      <td className={styles.num}>{fmt(e.humidity)}</td>
                      <td className={styles.num}>{fmt(e.moisture)}</td>
                    </tr>
                  ))}
                  <tr className={styles.dayTotal}>
                    <td colSpan={3}>Daily total for {fmtDate(day.date)}</td>
                    <td className={styles.num}>{fmt(day.total)}</td>
                    <td colSpan={4} />
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
