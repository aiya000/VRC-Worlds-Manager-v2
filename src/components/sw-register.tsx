'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.info(`Service Worker registered: ${reg.scope}`)
        })
        .catch((err) => {
          console.error(`Service Worker registration failed: ${err}`)
        })
    }
  }, [])

  return null
}
