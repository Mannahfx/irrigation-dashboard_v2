import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import supabase from '../lib/supabase'
import { logActivity } from '../lib/activityLogger'

const AuthContext = createContext(null)

// Pre-registered admin access codes. Company workers must enter one of these
// during signup to register as an admin. Add more codes here or manage them
// in the Supabase admin_codes table later.
const VALID_ADMIN_CODES = [
  'REVOSMART-2026',
  'ADM-001',
  'ADM-002',
  'ADM-003',
  'ADM-004',
  'ADM-005',
]

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function validateAdminCode(code) {
  return VALID_ADMIN_CODES.includes(code.trim().toUpperCase())
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile from the profiles table, auto-upsert if missing
  const fetchProfile = useCallback(async (userId, userEmail, userMeta) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      // Profile missing — create one with role from user_metadata (set during signup)
      const signupRole = userMeta?.role || 'client'
      const newProfile = {
        id: userId,
        email: userEmail || '',
        display_name: userMeta?.display_name || (userEmail ? userEmail.split('@')[0] : 'User'),
        role: signupRole,
        employee_id: userMeta?.employee_id || null,
        last_login: new Date().toISOString(),
      }
      const { data: upserted } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single()
      return upserted || newProfile
    }
    return data
  }, [])

  // Update last_login timestamp
  const updateLastLogin = useCallback(async (userId) => {
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
  }, [])

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const prof = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata)
        setProfile(prof)
      }
      setLoading(false)
    })

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const prof = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata)
          setProfile(prof)

          if (event === 'SIGNED_IN') {
            await updateLastLogin(session.user.id)
            await logActivity(
              session.user.id,
              session.user.email,
              'LOGIN',
              `User signed in as ${prof?.role || 'client'}`
            )
          }
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, updateLastLogin])

  // Login with email + password
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }, [])

  // Sign up with email + password + display name + optional role/adminCode
  const signup = useCallback(async (email, password, displayName, role = 'client', adminCode = '') => {
    // Validate admin code if registering as admin
    if (role === 'admin') {
      if (!validateAdminCode(adminCode)) {
        throw new Error('Invalid Admin Access Code. Please contact your company administrator.')
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: role,
          employee_id: role === 'admin' ? adminCode.trim().toUpperCase() : null,
        },
      },
    })
    if (error) throw error
    return data
  }, [])

  // Logout
  const logout = useCallback(async () => {
    if (user) {
      await logActivity(user.id, user.email, 'LOGOUT', 'User signed out')
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [user])

  // Reset password
  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }, [])

  const value = {
    user,
    profile,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    isAdmin: profile?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
