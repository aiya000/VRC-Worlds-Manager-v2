'use client'

import React, { useState, useEffect, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { WorldCardPreview } from '@/components/world-card'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Loader2, Globe } from 'lucide-react'
import { commands, CardSize } from '@/lib/commands'
import { SetupLayout } from '@/app/setup/components/setup-layout'
import { useLocalization } from '@/hooks/use-localization'
import { LocalizationContext } from '@/components/localization-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { info, error } from '@/lib/services/logger'
import { SaturnIcon } from '@/components/icons/saturn-icon'
import { FolderOpen, Info } from 'lucide-react'
import { MigrationConfirmationPopup } from '@/app/listview/settings/components/popups/migration-confirmation-popup'
import { SiGithub } from '@icons-pack/react-simple-icons'

const WelcomePage: React.FC = () => {
  const router = useRouter()
  const { t } = useLocalization()
  const { setTheme } = useTheme()
  const { setLanguage } = useContext(LocalizationContext)
  const [selectedSize, setSelectedSize] = useState<CardSize>('Normal')
  const [page, setPage] = useState(1)
  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-US',
    card_size: 'Normal' as CardSize,
  })
  const [migrationFiles, setMigrationFiles] = useState<
    [File | null, File | null]
  >([null, null])
  const [pathValidation, setPathValidation] = useState<[boolean, boolean]>([
    false,
    false,
  ])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [alreadyMigrated, setAlreadyMigrated] = useState<boolean>(false)
  const [hasExistingData, setHasExistingData] = useState<[boolean, boolean]>([
    false,
    false,
  ])
  const [migrationMeta, setMigrationMeta] = useState<{
    number_of_worlds: number
    number_of_folders: number
  } | null>(null)
  const [migrationMetaLoading, setMigrationMetaLoading] = useState(false)
  const [migrationMetaError, setMigrationMetaError] = useState<string | null>(
    null,
  )
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false)

  useEffect(() => {
    info(`Theme changed to: ${preferences.theme}`)
  }, [preferences.theme])

  const migrate = async (): Promise<boolean> => {
    if (!migrationFiles[0] || !migrationFiles[1]) {
      return false
    }
    const result = await commands.migrateOldDataFromFiles(
      migrationFiles[0],
      migrationFiles[1],
    )
    if (result.status === 'error') {
      toast(t('general:error-title'), {
        description: t('setup-page:toast:error:migrate:message', result.error),
      })
      return false
    }
    toast(t('general:success-title'), {
      description: t('setup-page:toast:success:migrate:message'),
    })
    return true
  }

  const handleNext = async () => {
    if (page === 1) {
      setLanguage(preferences.language)
    }
    if (page === 2) {
      try {
        const hasDataResult = await commands.checkExistingData()
        if (hasDataResult.status === 'ok') {
          setHasExistingData(hasDataResult.data)
        } else {
          error(`Failed to fetch existing data: ${hasDataResult.error}`)
        }

        // Web version: no auto-detection of old installation paths.
        // User must manually select files.
        setPathValidation([false, false])
      } catch (e) {
        error(`Failed to check existing data: ${e}`)
        setPathValidation([false, false])
      }
    }
    if (page === 3) {
      if (
        !pathValidation[0] ||
        !pathValidation[1] ||
        migrationMetaError !== null
      ) {
        setAlreadyMigrated(false)
        setPage(3)
        return
      }

      if (hasExistingData[0] || hasExistingData[1]) {
        setShowMigrationConfirm(true)
        return
      }
      await runMigration()
      return
    }
    if (page === 6) {
      const [result_theme, result_language, result_card_size] =
        await Promise.all([
          commands.setTheme(preferences.theme),
          commands.setLanguage(preferences.language),
          commands.setCardSize(preferences.card_size),
        ])

      const errorResult =
        result_theme.status === 'error'
          ? result_theme
          : result_language.status === 'error'
            ? result_language
            : result_card_size.status === 'error'
              ? result_card_size
              : null

      if (errorResult) {
        toast(t('general:error-title'), {
          description: t(
            'setup-page:toast:error:save-preference:message',
            errorResult.error,
          ),
        })

        error(`Failed to save preferences: ${errorResult.error}`)
        setPage(5)
        return
      }

      await commands.createEmptyAuth()

      if (!alreadyMigrated) {
        await commands.createEmptyFiles()
      }

      router.push('/login')
      return
    }
    setPage(page + 1)
  }

  const runMigration = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const migrated = await migrate()
      if (!migrated) {
        setPage(3)
        return
      }
      setAlreadyMigrated(true)
      setPage(4)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error(`Migration failed unexpectedly: ${message}`)
      toast(t('general:error-title'), {
        description: t('setup-page:toast:error:migrate:message', message),
      })
      setPage(3)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setPage(page - 1)
  }

  const handleFilePick = (index: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        info('File selection cancelled')
        return
      }

      const newFiles: [File | null, File | null] = [...migrationFiles]
      newFiles[index] = file
      setMigrationFiles(newFiles)

      const newValidation: [boolean, boolean] = [...pathValidation]
      newValidation[index] = true
      setPathValidation(newValidation)

      info(`Selected file: ${file.name}`)
    }
    input.click()
  }

  // Fetch migration metadata when both files are selected
  useEffect(() => {
    const fetchMeta = async () => {
      if (
        pathValidation[0] &&
        pathValidation[1] &&
        migrationFiles[0] &&
        migrationFiles[1]
      ) {
        setMigrationMetaLoading(true)
        setMigrationMetaError(null)
        setMigrationMeta(null)
        try {
          const result = await commands.getMigrationMetadataFromFiles(
            migrationFiles[0],
            migrationFiles[1],
          )
          if (result.status === 'ok') {
            setMigrationMeta(result.data)
          } else {
            setMigrationMetaError(result.error)
          }
        } catch (e: unknown) {
          setMigrationMetaError(
            e instanceof Error ? e.message : 'Unknown error',
          )
        } finally {
          setMigrationMetaLoading(false)
        }
      } else {
        setMigrationMeta(null)
        setMigrationMetaError(null)
        setMigrationMetaLoading(false)
      }
    }
    fetchMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    migrationFiles[0],
    migrationFiles[1],
    pathValidation[0],
    pathValidation[1],
  ])

  const handleMigrationConfirm = async () => {
    setShowMigrationConfirm(false)
    try {
      await runMigration()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error(`Migration confirmation failed: ${message}`)
      toast(t('general:error-title'), {
        description: t('setup-page:toast:error:migrate:message', message),
      })
      setPage(3)
    }
  }

  const handleMigrationCancel = () => {
    setShowMigrationConfirm(false)
    setAlreadyMigrated(true)
    setPage(4)
  }

  return (
    <>
      <div className="welcome-page">
        <MigrationConfirmationPopup
          open={showMigrationConfirm}
          onOpenChange={(open) => {
            if (!open) setShowMigrationConfirm(false)
          }}
          onCancel={handleMigrationCancel}
          onConfirm={handleMigrationConfirm}
        />

        {page === 1 && (
          <SetupLayout
            title="言語 / Language"
            currentPage={1}
            onBack={handleBack}
            onNext={handleNext}
            isFirstPage={true}
          >
            <div className="h-full flex flex-col justify-center space-y-8">
              {/* Keep this screen bilingual and hardcoded so users can choose a language before localized keys are applied. */}
              <div className="space-y-2 text-center">
                <p>
                  初期設定およびこのアプリで使用する言語を設定してください。
                </p>
                <p>Please select the language to use for setup and this app.</p>
              </div>

              <div className="space-y-3">
                <Button
                  variant={
                    preferences.language === 'ja-JP' ? 'default' : 'outline'
                  }
                  className="w-full"
                  onClick={() => {
                    setLanguage('ja-JP')
                    setPreferences({ ...preferences, language: 'ja-JP' })
                  }}
                >
                  日本語
                </Button>
                <Button
                  variant={
                    preferences.language === 'en-US' ? 'default' : 'outline'
                  }
                  className="w-full"
                  onClick={() => {
                    setLanguage('en-US')
                    setPreferences({ ...preferences, language: 'en-US' })
                  }}
                >
                  English
                </Button>
              </div>

              <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>この設定は後から変えることができます。</p>
                <p>You can change this setting later.</p>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 2 && (
          <SetupLayout
            title={t('setup-page:welcome-title')}
            currentPage={2}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="h-full flex flex-col items-center justify-center space-y-6 relative">
              <div className="absolute top-0 right-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Globe className="h-4 w-4" />
                      <span>
                        {preferences.language === 'en-US'
                          ? 'English'
                          : '日本語'}
                      </span>
                      <span className="sr-only">Change Language</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setLanguage('en-US')
                        setPreferences({ ...preferences, language: 'en-US' })
                      }}
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setLanguage('ja-JP')
                        setPreferences({ ...preferences, language: 'ja-JP' })
                      }}
                    >
                      日本語
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Existing welcome content */}
              <h2 className="text-2xl font-semibold">
                {t('setup-page:thank-you')}
              </h2>
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  {t('setup-page:first-time')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('setup-page:not-first-time:foretext')}
                  <a
                    href="https://github.com/aiya000/VRC-Worlds-Manager-v2/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <SiGithub className="h-4 w-4" />
                    {t('setup-page:github-issues')}
                  </a>{' '}
                  {t('setup-page:not-first-time:posttext')}
                </p>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 3 && (
          <SetupLayout
            title={t('setup-page:migration-title')}
            currentPage={3}
            onBack={handleBack}
            onNext={handleNext}
            isMigrationPage={true}
            isValid={
              pathValidation[0] &&
              pathValidation[1] &&
              migrationMetaError === null
            }
          >
            <div className="flex flex-col flex-1 space-y-6 justify-between h-full min-h-[400px]">
              <div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('setup-page:migration-description')}
                  </p>
                </div>

                <div className="space-y-4 mt-4">
                  {/* Worlds file selection */}
                  <div className="space-y-2">
                    <Label>{t('general:worlds-data')}</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        value={migrationFiles[0]?.name ?? ''}
                        readOnly
                        placeholder={t(
                          'settings-page:select-worlds-file-placeholder',
                        )}
                        className={
                          pathValidation[0]
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleFilePick(0)}
                      >
                        {t('general:select-button')}
                      </Button>
                    </div>
                    <div className="h-3">
                      {!pathValidation[0] && (
                        <p className="text-sm text-red-500">
                          {t('setup-page:worlds-file-error')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Folders file selection */}
                  <div className="space-y-2">
                    <Label>{t('general:folders-data')}</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        value={migrationFiles[1]?.name ?? ''}
                        readOnly
                        placeholder={t(
                          'settings-page:select-folders-file-placeholder',
                        )}
                        className={
                          pathValidation[1]
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleFilePick(1)}
                      >
                        {t('general:select-button')}
                      </Button>
                    </div>
                    <div className="h-3">
                      {!pathValidation[1] && (
                        <p className="text-sm text-red-500">
                          {t('setup-page:folders-file-error')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Migration metadata preview */}
                  {(migrationMetaLoading ||
                    migrationMetaError ||
                    migrationMeta) && (
                    <div className="mt-4">
                      {migrationMetaLoading && (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>
                            {t('settings-page:loading-migration-data')}
                          </span>
                        </div>
                      )}
                      {migrationMetaError && (
                        <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
                          <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{migrationMetaError}</span>
                        </div>
                      )}
                      {migrationMeta && (
                        <div className="bg-muted rounded-md p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <SaturnIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {t('settings-page:worlds-count')}:
                            </span>
                            <span className="text-sm">
                              {migrationMeta.number_of_worlds}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {t('settings-page:folders-count')}:
                            </span>
                            <span className="text-sm">
                              {migrationMeta.number_of_folders}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 4 && (
          <SetupLayout
            title={t('setup-page:ui-customization-title')}
            currentPage={4}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t('setup-page:ui-description')}
              </p>
              <div className="flex flex-row justify-between">
                <div className="flex flex-col items-left space-y-4">
                  <div className="flex flex-col space-y-1">
                    <Label>{t('setup-page:worlds-label')}</Label>
                    <div className="text-sm text-gray-500">
                      {t('setup-page:worlds-design')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.card_size}
                    onValueChange={(value: CardSize) => {
                      setSelectedSize(value)
                      setPreferences({ ...preferences, card_size: value })
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compact">
                        {t('general:compact')}
                      </SelectItem>
                      <SelectItem value="Normal">
                        {t('general:normal')}
                      </SelectItem>
                      <SelectItem value="Expanded">
                        {t('general:expanded')}
                      </SelectItem>
                      <SelectItem value="Original">
                        {t('general:original')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-w-[300px] w-full">
                  <div className="flex justify-center">
                    <WorldCardPreview
                      size={selectedSize}
                      world={{
                        worldId: '1',
                        name: t('settings-page:preview-world'),
                        thumbnailUrl: '/icons/1.png',
                        authorName: t('general:author'),
                        lastUpdated: '2017-03-09',
                        visits: 616,
                        dateAdded: '2025-01-01',
                        favorites: 59,
                        platform: ['standalonewindows', 'android', 'ios'],
                        folders: [],
                        tags: [],
                        capacity: 16,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 5 && (
          <SetupLayout
            title={t('setup-page:preferences-title')}
            currentPage={5}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('setup-page:preferences-description')}
              </p>
              <div className="flex flex-col space-y-8 py-6">
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">
                      {t('general:theme-label')}
                    </Label>
                    <div className="text-sm text-gray-500">
                      {t('general:theme-description')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.theme}
                    onValueChange={(value) => {
                      setTheme(value)
                      setPreferences({ ...preferences, theme: value })
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        {t('general:light')}
                      </SelectItem>
                      <SelectItem value="dark">{t('general:dark')}</SelectItem>
                      <SelectItem value="system">
                        {t('general:system')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">
                      {t('general:language-label')}
                    </Label>
                    <div className="text-sm text-gray-500">
                      {t('general:language-description')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.language}
                    onValueChange={(value) => {
                      setLanguage(value)
                      setPreferences({ ...preferences, language: value })
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja-JP">日本語</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 6 && (
          <SetupLayout
            title={t('setup-page:complete-title')}
            currentPage={6}
            onBack={handleBack}
            onNext={handleNext}
            isLastPage={true}
          >
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <h2 className="text-3xl font-bold">
                  {t('setup-page:all-set')}
                </h2>

                <div className="space-y-8">
                  <p className="text-lg text-muted-foreground mt-4">
                    {t('setup-page:welcome-text')}
                  </p>

                  <p className="text-base text-muted-foreground">
                    {t('setup-page:hope-text')}
                  </p>
                </div>

                <div className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t('setup-page:need-help:foretext')}
                    <a
                      href="https://github.com/aiya000/VRC-Worlds-Manager-v2/issues/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      <SiGithub className="h-4 w-4" />
                      {t('setup-page:github-issues')}
                    </a>
                    {t('setup-page:need-help:posttext')}
                  </p>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
      </div>
    </>
  )
}

export default WelcomePage
