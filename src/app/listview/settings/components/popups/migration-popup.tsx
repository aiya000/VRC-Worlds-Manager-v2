import { useState } from 'react'
import { useLocalization } from '@/hooks/use-localization'
import { commands } from '@/lib/commands'
import {
  FolderOpen,
  Loader2,
  Info,
  AlertTriangle,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SaturnIcon } from '@/components/icons/saturn-icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MigrationData {
  number_of_worlds: number
  number_of_folders: number
}

interface MigrationPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (worldsFile: File, foldersFile: File) => Promise<void>
}

export function MigrationPopup({
  open,
  onOpenChange,
  onConfirm,
}: MigrationPopupProps) {
  const { t } = useLocalization()
  const [migrationFiles, setMigrationFiles] = useState<
    [File | null, File | null]
  >([null, null])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [migrationData, setMigrationData] = useState<MigrationData | null>(null)

  const handleFilePick = (index: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        console.info('File selection cancelled')
        return
      }

      try {
        const newFiles: [File | null, File | null] = [...migrationFiles]
        newFiles[index] = file
        setMigrationFiles(newFiles)

        if (newFiles[0] && newFiles[1]) {
          await validateAndLoadMetadata(newFiles[0], newFiles[1])
        }
      } catch (e) {
        console.error(`Failed to select file: ${e}`)
        setErrorMessage(t('settings-page:error-select-file'))
      }
    }
    input.click()
  }

  const validateAndLoadMetadata = async (
    worldsFile: File,
    foldersFile: File,
  ) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await commands.getMigrationMetadataFromFiles(
        worldsFile,
        foldersFile,
      )

      if (result.status === 'error') {
        setErrorMessage(result.error)
        setMigrationData(null)
        setIsLoading(false)
        return
      }
      const data: MigrationData = {
        number_of_worlds: result.data.number_of_worlds,
        number_of_folders: result.data.number_of_folders,
      }
      setMigrationData(data)
      setIsLoading(false)
    } catch (e) {
      console.error(`Failed to read migration data: ${e}`)
      setErrorMessage(t('settings-page:error-read-migration-files'))
      setMigrationData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!migrationFiles[0] || !migrationFiles[1]) {
      return
    }

    try {
      await onConfirm(migrationFiles[0], migrationFiles[1])

      setMigrationFiles([null, null])
      setMigrationData(null)
      onOpenChange(false)
    } catch (e) {
      console.error(`Migration confirmation error: ${e}`)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings-page:data-migration-title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings-page:data-migration-description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-4">
            {/* Worlds file selection */}
            <div className="space-y-2">
              <Label>{t('general:worlds-data')}</Label>
              <div className="flex space-x-2">
                <Input
                  value={migrationFiles[0]?.name ?? ''}
                  readOnly
                  placeholder={t(
                    'settings-page:select-worlds-file-placeholder',
                  )}
                  className="text-muted-foreground flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleFilePick(0)}
                  className="whitespace-nowrap gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  {t('general:select-button')}
                </Button>
              </div>
            </div>

            {/* Folders file selection */}
            <div className="space-y-2">
              <Label>{t('general:folders-data')}</Label>
              <div className="flex space-x-2">
                <Input
                  value={migrationFiles[1]?.name ?? ''}
                  readOnly
                  placeholder={t(
                    'settings-page:select-folders-file-placeholder',
                  )}
                  className="text-muted-foreground flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleFilePick(1)}
                  className="whitespace-nowrap gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  {t('general:select-button')}
                </Button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t('settings-page:loading-migration-data')}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {migrationData && (
            <div className="bg-muted rounded-md p-4 space-y-3">
              <div className="flex items-center gap-2">
                <SaturnIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('settings-page:worlds-count')}:
                </span>
                <span className="text-sm">
                  {migrationData.number_of_worlds}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('settings-page:folders-count')}:
                </span>
                <span className="text-sm">
                  {migrationData.number_of_folders}
                </span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">
                {t('settings-page:warning')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t('settings-page:warning-text-1')}
                <br />
                {t('settings-page:warning-text-2')}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('general:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={
              !migrationFiles[0] ||
              !migrationFiles[1] ||
              isLoading ||
              !migrationData
            }
            onClick={handleConfirm}
            className="bg-primary gap-2"
          >
            {t('settings-page:start-migration')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
