'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccessLevel } from './useAccessLevel'

export function useRouteGuard(requiredLevel = 1) {
  const { level, isLoading } = useAccessLevel()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (level < requiredLevel) {
      router.replace('/')
    }
  }, [level, isLoading, requiredLevel, router])

  return { level, isLoading, hasAccess: level >= requiredLevel }
}