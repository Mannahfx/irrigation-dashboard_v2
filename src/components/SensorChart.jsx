import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import styles from './SensorChart.module.css'

export default function SensorChart({ tempHistory, moistHistory }) {
  const data = tempHistory.map((t, i) => ({
    time: t.time,
    temp: t.value,
    moisture: moistHistory[i]?.value ?? null,
  }))

  if (data.length < 2) {
    return (
      <div className={styles.empty}>
        Waiting for sensor data — chart updates every 10 seconds
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Sensor History (last 30 readings)</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fill: '#6b8f84', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#6b8f84', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#0d1f1c', border: '1px solid #1d3d35', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#6b8f84' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#6b8f84' }} />
          <Line type="monotone" dataKey="temp"     stroke="#60a5fa" strokeWidth={2} dot={false} name="Temp °C" />
          <Line type="monotone" dataKey="moisture" stroke="#1D9E75" strokeWidth={2} dot={false} name="Moisture %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
