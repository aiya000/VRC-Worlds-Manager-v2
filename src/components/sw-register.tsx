'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // The version is part of the script URL so that each release installs its
      // own worker with its own cache, and the previous release's precached
      // shell is thrown away rather than served to offline users forever.
      const version = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown'
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(version)}`)
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
