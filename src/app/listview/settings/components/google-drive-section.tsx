'use client'

import { Cloud, RefreshCw, Unlink } from 'lucide-react'
import { useEffect, useState, type FC } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useLocalization } from '@/hooks/use-localization'
import { commands } from '@/lib/commands'
import { preloadGoogleIdentityScript } from '@/lib/services/google-auth-service'
import {
  syncStepPercentage,
  type SyncStep,
} from '@/lib/services/drive-sync-service'

/**
 * Connect, disconnect, and one button that syncs. Everything that decides
 * *when* to sync on its own -- startup, edits, coming back to the tab -- is a
 * later PR; this screen only ever syncs because someone asked it to.
 */
export const GoogleDriveSection: FC = () => {
  const { t } = useLocalization()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [step, setStep] = useState<SyncStep | null>(null)

  useEffect(() => {
    // Loaded ahead of the click that needs it: Google requires the token
    // request to happen synchronously within a user gesture, which an await
    // on the script tag's own load would break.
    preloadGoogleIdentityScript()

    commands.isGoogleDriveConnected().then((result) => {
      setConnected(result.status === 'ok' ? result.data : false)
    })
    commands.googleDriveLastSyncedAt().then((result) => {
      setLastSyncedAt(result.status === 'ok' ? result.data : null)
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

  const syncNow = async () => {
    setSyncing(true)
    setStep('authorizing')
    try {
      const result = await commands.syncGoogleDriveNow(setStep)
      if (result.status === 'error') {
        toast(t('general:error-title'), { description: result.error })
        return
      }

      if (result.data.kind === 'reauth-needed') {
        toast(t('settings-page:google-drive-reauth-needed'))
        return
      }
      if (result.data.kind === 'dismissed') {
        toast(t('settings-page:google-drive-dismissed'))
        return
      }
      if (result.data.kind === 'unanswered') {
        toast(t('general:error-title'), {
          description: t('settings-page:google-drive-unanswered'),
        })
        return
      }

      setLastSyncedAt(result.data.syncedAt)
      toast(t('general:success-title'), {
        description:
          result.data.memoConflicts === 0
            ? t('settings-page:google-drive-sync-success')
            : t(
                'settings-page:google-drive-sync-conflicts',
                result.data.memoConflicts,
              ),
      })
    } finally {
      setSyncing(false)
      setStep(null)
    }
  }

  return (
    <Card className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            disabled={busy || syncing}
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
      </div>

      {connected === true && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {lastSyncedAt === null
              ? t('settings-page:google-drive-never-synced')
              : t(
                  'settings-page:google-drive-last-synced',
                  new Date(lastSyncedAt).toLocaleString(),
                )}
          </div>
          {/* Deliberately full width and tall: a VR controller aims a laser,
              and this is the button that also stands in for signing back in
              once the hour-long token runs out. */}
          <Button
            className="h-12 w-full gap-2 text-base"
            disabled={busy || syncing}
            onClick={syncNow}
          >
            <RefreshCw
              className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            {syncing
              ? t('settings-page:google-drive-syncing')
              : t('settings-page:google-drive-sync-now')}
          </Button>
          {syncing && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {/* A percentage rather than a spinner alone: a sync that has
                  stopped and a sync that is slow look identical otherwise,
                  and the first one that went wrong sat on "syncing" with
                  nothing to say whether anything was still happening. */}
              <div>
                {step === null
                  ? t('settings-page:google-drive-syncing')
                  : `${syncStepPercentage(step)}% — ${t(
                      `settings-page:google-drive-step-${step}`,
                    )}`}
              </div>
              <div className="text-xs">
                {t('settings-page:google-drive-do-not-reload')}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
