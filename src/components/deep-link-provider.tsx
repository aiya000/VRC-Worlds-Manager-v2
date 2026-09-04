'use client'

import { useEffect } from 'react'
import { useFolders } from '@/app/listview/hook/use-folders'

export const DeepLinkProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { importFolder } = useFolders()

  useEffect(() => {
    // Web version: detect ?import=<shareId> in the URL query parameters
    const params = new URLSearchParams(window.location.search)
    const importId = params.get('import')
    if (importId) {
      console.info(`[DeepLink] Detected import parameter: ${importId}`)
      importFolder(importId)
      // Clean up the URL to remove the query parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('import')
      window.history.replaceState({}, '', url.toString())
    }
  }, [importFolder])

  return <>{children}</>
}
