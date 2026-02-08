import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cadence - Modern CRM for Service Businesses',
  description: 'A lightweight, powerful CRM built for agencies, consultants, and service teams.',
  icons: {
    icon: '/logo.png',
  },
}

// Script to apply saved accent color on load
const accentScript = `
  (function() {
    const accent = localStorage.getItem('cadence-accent');
    if (accent) {
      const colorMap = {
        '#E91E8C': { h: 326, s: 84, l: 51 },
        '#3B82F6': { h: 217, s: 91, l: 60 },
        '#10B981': { h: 160, s: 84, l: 39 },
        '#F59E0B': { h: 38, s: 92, l: 50 },
        '#8B5CF6': { h: 258, s: 90, l: 66 },
      };
      const hsl = colorMap[accent];
      if (hsl) {
        document.documentElement.style.setProperty('--accent-color', accent);
        document.documentElement.style.setProperty('--primary-500', accent);
        document.documentElement.style.setProperty('--primary-600', 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + (hsl.l - 10) + '%)');
        document.documentElement.style.setProperty('--primary-400', 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + (hsl.l + 10) + '%)');
        document.documentElement.style.setProperty('--primary-100', 'hsl(' + hsl.h + ', ' + hsl.s + '%, 95%)');
        document.documentElement.style.setProperty('--primary-50', 'hsl(' + hsl.h + ', ' + hsl.s + '%, 97%)');
      }
    }
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
