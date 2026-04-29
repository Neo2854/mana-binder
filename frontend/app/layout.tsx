import type { Metadata } from 'next'
import './globals.css'
import Navigation from './components/Navigation'

export const metadata: Metadata = {
  title: 'ManaGate - MTG Collection Manager',
  description: 'Modern Magic: The Gathering Collection Manager and Deckbuilder',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
