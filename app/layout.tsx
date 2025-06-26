import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Float 30 Restaurant - Reservations',
  description: 'Make a reservation at Float 30 Restaurant. Experience exceptional dining in Vancouver.',
  keywords: 'restaurant, reservations, dining, Vancouver, Float 30, fine dining',
  authors: [{ name: 'Float 30 Restaurant' }],
  creator: 'Float 30 Restaurant',
  publisher: 'Float 30 Restaurant',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://reservations.float30restaurant.com'), // Update with your actual domain
  openGraph: {
    title: 'Float 30 Restaurant - Reservations',
    description: 'Make a reservation at Float 30 Restaurant. Experience exceptional dining in Vancouver.',
    url: 'https://reservations.float30restaurant.com',
    siteName: 'Float 30 Restaurant',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg', // You'll need to add this image
        width: 1200,
        height: 630,
        alt: 'Float 30 Restaurant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Float 30 Restaurant - Reservations',
    description: 'Make a reservation at Float 30 Restaurant. Experience exceptional dining in Vancouver.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Analytics />
        {children}
      </body>
    </html>
  )
}