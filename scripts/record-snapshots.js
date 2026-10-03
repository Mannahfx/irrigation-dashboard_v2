// scripts/record-snapshots.js
// This script runs on a schedule (e.g. via GitHub Actions) to record sensor snapshots for all kits
import { createClient } from '@supabase/supabase-js'
import mqtt from 'mqtt'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend script
const MQTT_BROKER = process.env.VITE_MQTT_BROKER || 'wss://broker.hivemq.com:8884/mqtt'
const MQTT_USERNAME = process.env.VITE_MQTT_USERNAME
const MQTT_PASSWORD = process.env.VITE_MQTT_PASSWORD

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// How long to wait for a sensor reading from a kit before giving up (ms)
const TIMEOUT_MS = 30000 

async function run() {
  console.log('Fetching active kits from Supabase...')
  const { data: kits, error: kitsError } = await supabase.from('kits').select('kit_id')
  
  if (kitsError) {
    console.error('Error fetching kits:', kitsError)
    process.exit(1)
  }

  if (!kits || kits.length === 0) {
    console.log('No kits found.')
    process.exit(0)
  }

  console.log(`Found ${kits.length} kits. Connecting to MQTT broker...`)
  
  const client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clientId: 'REVO_BACKEND_' + Math.random().toString(16).slice(2, 8),
  })

  // Keep track of readings collected
  const readings = new Map()
  const expectedKits = new Set(kits.map(k => k.kit_id))

  client.on('connect', () => {
    console.log('Connected to MQTT.')
    kits.forEach(kit => {
      // Subscribe to all topics for this kit
      client.subscribe(`${kit.kit_id}/#`)
      readings.set(kit.kit_id, {})
    })
  })

  client.on('message', (topic, message) => {
    const parts = topic.split('/')
    const kitId = parts[0]
    
    if (!expectedKits.has(kitId)) return

    const sub = parts[1]
    const subsub = parts[2]
    const val = message.toString()
    
    const kitData = readings.get(kitId) || {}

    if (sub === 'sensor') {
      if (subsub === 'temperature') kitData.temperature = parseFloat(val)
      else if (subsub === 'humidity') kitData.humidity = parseFloat(val)
      else if (subsub === 'moisture') kitData.moisture = parseFloat(val)
      else if (subsub === 'flowrate') kitData.flow_rate = parseFloat(val)
      else if (subsub === 'totalflow') kitData.total_flow = parseFloat(val)
      else if (subsub === 'tank') kitData.tank_state = val
    } else if (sub === 'relay') {
      if (subsub === 'state') kitData.valve_state = val
      else if (subsub === 'pump') kitData.pump_state = val
      else if (subsub === 'fan') kitData.fan_state = val
    } else if (sub === 'mode') {
      kitData.mode = val
    }
    
    // Minimal requirement to consider a snapshot "captured" is having temp/hum/moisture OR flow
    kitData._received = true
    readings.set(kitId, kitData)
  })

  // Wait for incoming messages
  console.log(`Listening for up to ${TIMEOUT_MS / 1000} seconds...`)
  
  await new Promise(resolve => setTimeout(resolve, TIMEOUT_MS))
  
  console.log('Finished listening. Processing results...')
  client.end()

  const snapshotsToInsert = []
  const now = new Date().toISOString()

  for (const [kitId, data] of readings.entries()) {
    if (data._received) {
      delete data._received
      snapshotsToInsert.push({
        kit_id: kitId,
        recorded_at: now,
        ...data
      })
    } else {
      console.log(`No data received for kit: ${kitId}`)
    }
  }

  if (snapshotsToInsert.length > 0) {
    console.log(`Inserting ${snapshotsToInsert.length} snapshots into Supabase...`)
    const { error } = await supabase.from('sensor_snapshots').insert(snapshotsToInsert)
    if (error) {
      console.error('Error inserting snapshots:', error)
      process.exit(1)
    }
    console.log('Successfully recorded snapshots!')
  } else {
    console.log('No complete snapshots to insert.')
  }
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
