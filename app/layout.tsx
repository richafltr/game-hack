import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'gametok',
  description: 'Tiktok for games',
  generator: 'game.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
