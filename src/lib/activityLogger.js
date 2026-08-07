import supabase from './supabase'

export async function logActivity(userId, userEmail, action, details, deviceId = 'manna') {
  try {
    await supabase.from('activities').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      details,
      device_id: deviceId,
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}
