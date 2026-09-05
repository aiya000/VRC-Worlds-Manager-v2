'use client'

import { Cloud, Unlink } from 'lucide-react'
import { useEffect, useState, type FC } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useLocalization } from '@/hooks/use-localization'
import { commands } from '@/lib/commands'
import { preloadGoogleIdentityScript } from '@/lib/services/google-auth-service'

/**
 * Connect/disconnect only -- no pull, no push. Those land in a later PR once
 * this much is proven to work.
 */
export const GoogleDriveSection: FC = () => {
  const { t } = useLocalization()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Loaded ahead of the click that needs it: Google requires the token
    // request to happen synchronously within a user gesture, which an await
    // on the script tag's own load would break.
    preloadGoogleIdentityScript()

    commands.isGoogleDriveConnected().then((result) => {
      setConnected(result.status === 'ok' ? result.data : false)
    })
  }, [])

  const connect = async () => {
    setBusy(true)
    try {
      const result = await commands.connectGoogleDrive()
      if (result.status === 'error') {
        toast(t('general:error-title'), { description: result.error })
        return
      }
      setConnected(true)
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      const result = await commands.disconnectGoogleDrive()
      if (result.status === 'error') {
        toast(t('general:error-title'), { description: result.error })
        return
      }
      setConnected(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
      <div className="flex flex-col space-y-1.5">
        <Label className="text-base font-medium">
          {t('settings-page:google-drive-title')}
        </Label>
        <div className="text-sm text-muted-foreground">
          {connected === true
            ? t('settings-page:google-drive-connected')
            : t('settings-page:google-drive-description')}
        </div>
      </div>
      {connected === true ? (
        <Button
          variant="outline"
          className="gap-2"
          disabled={busy}
          onClick={disconnect}
        >
          <Unlink className="h-4 w-4" />
          <span className="text-sm">
            {t('settings-page:google-drive-disconnect')}
          </span>
        </Button>
      ) : (
        <Button
          variant="outline"
          className="gap-2"
          disabled={busy || connected === null}
          onClick={connect}
        >
          <Cloud className="h-4 w-4" />
          <span className="text-sm">
            {t('settings-page:google-drive-connect')}
          </span>
        </Button>
      )}
    </Card>
  )
}
