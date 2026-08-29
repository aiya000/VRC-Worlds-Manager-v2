'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalization } from '@/hooks/use-localization'
import { AlertCircle, Loader2, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { commands, WorldDetails } from '@/lib/commands'

interface ImportFavoritesFromAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step =
  | 'warn'
  | 'credentials'
  | '2fa'
  | 'fetching'
  | 'select'
  | 'importing'
  | 'done'

export function ImportFavoritesFromAccountDialog({
  open,
  onOpenChange,
}: ImportFavoritesFromAccountDialogProps) {
  const { t } = useLocalization()
  const router = useRouter()

  const [step, setStep] = useState<Step>('warn')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorCodeType, setTwoFactorCodeType] = useState('totp')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [sourceDisplayName, setSourceDisplayName] = useState('')
  const [fetchedWorlds, setFetchedWorlds] = useState<WorldDetails[]>([])
  const [fetchFailedCount, setFetchFailedCount] = useState(0)
  const [selectedWorldIds, setSelectedWorldIds] = useState<Set<string>>(
    new Set(),
  )
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importedCount, setImportedCount] = useState(0)

  const reset = () => {
    setStep('warn')
    setUsername('')
    setPassword('')
    setTwoFactorCode('')
    setLoading(false)
    setErrorMessage(null)
    setSourceDisplayName('')
    setFetchedWorlds([])
    setFetchFailedCount(0)
    setSelectedWorldIds(new Set())
    setImportProgress({ done: 0, total: 0 })
    setImportedCount(0)
  }

  const handleDialogClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  const fetchFavorites = async () => {
    setStep('fetching')
    setErrorMessage(null)
    try {
      const userResult = await commands.getCurrentUser()
      if (userResult.status === 'error') {
        setErrorMessage(userResult.error)
        setStep('credentials')
        return
      }
      setSourceDisplayName(userResult.data.displayName)

      const idsResult = await commands.getFavoriteWorldIds()
      if (idsResult.status === 'error') {
        setErrorMessage(idsResult.error)
        setStep('credentials')
        return
      }

      const worlds: WorldDetails[] = []
      let failed = 0
      for (const worldId of idsResult.data) {
        const worldResult = await commands.checkWorldInfo(worldId)
        if (worldResult.status === 'ok') {
          worlds.push(worldResult.data)
        } else {
          console.error(
            `[ImportFavorites] Failed to fetch world ${worldId}: ${worldResult.error}`,
          )
          failed += 1
        }
      }
      setFetchedWorlds(worlds)
      setFetchFailedCount(failed)
      setSelectedWorldIds(new Set(worlds.map((w) => w.worldId)))
      setStep('select')
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e))
      setStep('credentials')
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      await commands.logout()
      const result = await commands.loginWithCredentials(username, password)

      if (result.status === 'error') {
        if (result.error === '2fa-required') {
          setTwoFactorCodeType('totp')
          setStep('2fa')
        } else if (result.error === 'email-2fa-required') {
          setTwoFactorCodeType('emailOtp')
          setStep('2fa')
        } else {
          setErrorMessage(
            result.error || t('login-page:error-invalid-credentials'),
          )
        }
        return
      }

      await fetchFavorites()
    } finally {
      setLoading(false)
    }
  }

  const handle2fa = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const result = await commands.loginWith2fa(
        twoFactorCode,
        twoFactorCodeType,
      )
      if (result.status === 'error') {
        setErrorMessage(result.error || t('login-page:error-invalid-2fa'))
        return
      }
      await fetchFavorites()
    } finally {
      setLoading(false)
    }
  }

  const toggleWorldSelection = (worldId: string) => {
    setSelectedWorldIds((prev) => {
      const next = new Set(prev)
      if (next.has(worldId)) {
        next.delete(worldId)
      } else {
        next.add(worldId)
      }
      return next
    })
  }

  const handleImport = async () => {
    setStep('importing')
    const targets = fetchedWorlds.filter((w) => selectedWorldIds.has(w.worldId))
    setImportProgress({ done: 0, total: targets.length })

    let imported = 0
    for (const world of targets) {
      const result = await commands.putWorld({
        worldId: world.worldId,
        name: world.name,
        thumbnailUrl: world.thumbnailUrl,
        authorName: world.authorName,
        favorites: world.favorites,
        lastUpdated: world.lastUpdated,
        visits: world.visits,
        dateAdded: new Date().toISOString(),
        platform: world.platform,
        folders: [],
        tags: world.tags,
        capacity: world.capacity,
      })
      if (result.status === 'ok') {
        imported += 1
      }
      setImportProgress((prev) => ({ ...prev, done: prev.done + 1 }))
    }

    setImportedCount(imported)
    await commands.logout()
    setStep('done')
  }

  const handleGoToLogin = () => {
    handleDialogClose(false)
    router.push('/login')
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'warn' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {t('import-favorites:warning-title')}
              </DialogTitle>
              <DialogDescription>
                {t('import-favorites:warning-description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button onClick={() => setStep('credentials')}>
                {t('import-favorites:continue-button')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'credentials' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import-favorites:login-title')}</DialogTitle>
              <DialogDescription>
                {t('import-favorites:login-description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder={t('login-page:username-placeholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder={t('login-page:password-placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleLogin()
                  }
                }}
              />
              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button
                onClick={handleLogin}
                disabled={!username || !password || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('login-page:login-button')
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === '2fa' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('login-page:2fa-title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder={t('login-page:2fa-placeholder')}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handle2fa()
                  }
                }}
              />
              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button onClick={handle2fa} disabled={!twoFactorCode || loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('login-page:2fa-button')
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'fetching' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import-favorites:fetching-title')}</DialogTitle>
              <DialogDescription>
                {t('import-favorites:fetching-description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </>
        )}

        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('import-favorites:select-title', sourceDisplayName)}
              </DialogTitle>
              <DialogDescription>
                {t('import-favorites:select-description', fetchedWorlds.length)}
              </DialogDescription>
            </DialogHeader>
            {fetchFailedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                {t('import-favorites:fetch-partial-failure', fetchFailedCount)}
              </div>
            )}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {fetchedWorlds.map((world) => (
                <div key={world.worldId} className="flex items-center gap-2">
                  <Checkbox
                    id={`import-world-${world.worldId}`}
                    checked={selectedWorldIds.has(world.worldId)}
                    onCheckedChange={() => toggleWorldSelection(world.worldId)}
                  />
                  <Label
                    htmlFor={`import-world-${world.worldId}`}
                    className="truncate"
                  >
                    {world.name}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedWorldIds.size === 0}
              >
                {t('import-favorites:import-button', selectedWorldIds.size)}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'importing' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import-favorites:importing-title')}</DialogTitle>
              <DialogDescription>
                {t(
                  'import-favorites:importing-progress',
                  importProgress.done,
                  importProgress.total,
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import-favorites:done-title')}</DialogTitle>
              <DialogDescription>
                {t('import-favorites:done-description', importedCount)}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('import-favorites:relogin-notice')}
            </p>
            <DialogFooter>
              <Button className="w-full" onClick={handleGoToLogin}>
                {t('import-favorites:go-to-login-button')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
