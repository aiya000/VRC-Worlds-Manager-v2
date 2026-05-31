import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import '@/app/globals.css'
import { LocalizationContextProvider } from '@/components/localization-context'
import { DeepLinkProvider } from '@/components/deep-link-provider'
import { PatreonProvider } from '@/contexts/patreon-context'
import { SwRegister } from '@/components/sw-register'

const _geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const _geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'VRChat Worlds Manager Web',
  description: 'Manage your VRChat worlds with ease',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/app-icon.PNG" />
      </head>
      <body>
        <DeepLinkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LocalizationContextProvider>
              <PatreonProvider>
                <main>{children}</main>
              </PatreonProvider>
            </LocalizationContextProvider>
          </ThemeProvider>
          <Toaster richColors />
          <SwRegister />
        </DeepLinkProvider>
      </body>
    </html>
  )
}
