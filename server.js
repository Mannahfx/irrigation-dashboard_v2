import express from 'express'
import cron from 'node-cron'
import { exec } from 'child_process'

const app = express()
const PORT = process.env.PORT || 3000

// A simple health check route that UptimeRobot will ping to keep the server awake
app.get('/ping', (req, res) => res.status(200).send('Pong! Server is awake.'))
app.get('/', (req, res) => res.status(200).send('Pong! Server is awake.'))

// Define the exact-time schedule
// 0 7,9,11,13,15,17 * * * UTC = 8am, 10am, 12pm, 2pm, 4pm, 6pm Nigeria Time
const schedule = '0 7,9,11,13,15,17 * * *'

console.log(`Setting up cron schedule: ${schedule}`)

cron.schedule(schedule, () => {
  console.log(`[${new Date().toISOString()}] CRON TRIGGERED! Spawning background recorder...`)
  
  exec('node scripts/record-snapshots.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`[CRON ERROR]: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`[CRON STDERR]: ${stderr}`)
    }
    console.log(`[CRON STDOUT]:\n${stdout}`)
  })
}, {
  scheduled: true,
  timezone: "UTC"
})

app.listen(PORT, () => {
  console.log(`Render Server is listening on port ${PORT}`)
  console.log('Background cron job is active.')
})
