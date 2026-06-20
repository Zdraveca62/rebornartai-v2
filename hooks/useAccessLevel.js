'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'  // ← използваме същия клиент като останалите файлове

export function useAccessLevel() {
  const [state, setState] = useState({
    user: null,
    level: 0,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    let mounted = true

    async function getAccessLevel() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 user:', user)
    console.log('❌ authError:', authError)
        if (authError || !user) {
          if (mounted) setState(s => ({ ...s, level: 0, user: null, isLoading: false }))
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('access_level, full_name, initials, email')
          .eq('id', user.id)
          .single()
    console.log('📋 profile:', profile)
    console.log('❌ profileError:', profileError)
        if (profileError || !profile) {
          if (mounted) setState(s => ({ ...s, level: 0, user, isLoading: false }))
          return
        }
    console.log('✅ level:', profile.access_level)
        if (mounted) {
          setState({
            user: { ...user, ...profile },
            level: profile.access_level,
            isLoading: false,
            error: null
          })
        }

      } catch (err) {
        if (mounted) setState(s => ({ ...s, isLoading: false, error: err.message }))
      }
    }

    getAccessLevel()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getAccessLevel()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}