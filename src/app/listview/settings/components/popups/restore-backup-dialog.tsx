import { useState } from 'react'
import { useLocalization } from '@/hooks/use-localization'
import { commands } from '@/lib/commands'
import { FolderOpen } from 'lucide-react'
import { Calendar, Info, AlertTriangle, Loader2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaturnIcon } from '../../../../../components/icons/saturn-icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../../components/ui/alert-dialog'

interface BackupMetadata {
  date: string
  number_of_worlds: number
  number_of_folders: number
}

interface RestoreBackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (file: File) => Promise<void>
}

export function RestoreBackupDialog({
  open,
  onOpenChange,
  onConfirm,
}: RestoreBackupDialogProps) {
  const { t } = useLocalization()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<BackupMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDateConversion = (dateString: string) => {
    const dateParts = dateString.split('_')
    const date = dateParts[0]
    return date
  }

  const handleSelectBackup = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        console.info('Backup selection cancelled')
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = await commands.getBackupMetadataFromFile(file)

        if (result.status === 'error') {
          setErrorMessage(result.error)
          setSelectedFile(null)
          setMetadata(null)
          setIsLoading(false)
          return
        }

        setSelectedFile(file)
        const meta: BackupMetadata = {
          date: handleDateConversion(result.data.date),
          number_of_worlds: result.data.number_of_worlds,
          number_of_folders: result.data.number_of_folders,
        }
        setMetadata(meta)
        setIsLoading(false)
      } catch (e) {
        console.error(`Failed to select backup: ${e}`)
        setErrorMessage(t('settings-page:error-read-backup'))
        setIsLoading(false)
      }
    }
    input.click()
  }

  const handleConfirm = async () => {
    if (!selectedFile) {
      return
    }
    try {
      await onConfirm(selectedFile)
      setSelectedFile(null)
      setMetadata(null)
      onOpenChange(false)
    } catch (_e) {
      // Error handling is done in the parent component
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings-page:restore-backup')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings-page:restore-backup-description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex justify-between items-center w-full">
              <span>{t('settings-page:backup-location')}</span>
              <Button
                variant="outline"
                onClick={handleSelectBackup}
                className="gap-2 whitespace-nowrap"
              >
                <FolderOpen className="h-4 w-4" />
                {t('settings-page:select-backup')}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t('settings-page:loading-backup-info')}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {metadata && selectedFile && (
            <>
              <div className="bg-muted rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:backup-created')}:
                  </span>
                  <span className="text-sm">{metadata.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <SaturnIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:worlds-count')}:
                  </span>
                  <span className="text-sm">{metadata.number_of_worlds}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:folders-count')}:
                  </span>
                  <span className="text-sm">{metadata.number_of_folders}</span>
                </div>

                <div className="flex items-start gap-2 text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5" />
                  <div className="flex flex-col break-words">
                    <span className="text-sm font-medium">
                      {t('settings-page:backup-location')}:
                    </span>
                    <span className="text-sm break-words">
                      {selectedFile.name}
                    </span>
                  </div>
                </div>
              </div>

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
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('general:cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!selectedFile || isLoading}
            onClick={handleConfirm}
            className="bg-primary"
          >
            {t('settings-page:restore-confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
