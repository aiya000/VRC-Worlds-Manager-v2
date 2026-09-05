'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { commands } from '@/lib/commands'
import { useLocalization } from '@/hooks/use-localization'

export default function Home() {
  const router = useRouter()
  const { t } = useLocalization()

  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirstTime = await commands.requireInitialSetup()

      if (isFirstTime) {
        router.push('/setup')
      } else {
        const checkFilesAndAuth = async () => {
          const result = await commands.checkFilesLoaded()

          if (result.status === 'error') {
            console.error(`Error loading files: ${result.error}`)
            router.push(
              `${'/error/read_data_error'}?${encodeURIComponent(result.error)}`,
            )
            return
          }

          // Then check authentication
          const authResult = await commands.tryLogin()

          if (authResult.status === 'ok') {
            console.info('User is authenticated')
            router.push('/listview/folders/special/all')
          } else {
            router.push('/login')
          }
        }
        checkFilesAndAuth()
      }
    }
    checkFirstTime()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t('general:loading')}</p>
      {/* Google's brand verification fetches the app's home page and expects
          to find the privacy policy linked from it, so this link has to live
          in the statically exported HTML of `/` rather than only past the
          redirect above. */}
      <Link
        href="/privacy"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {t('privacy-policy:link-label')}
      </Link>
    </div>
  )
}
