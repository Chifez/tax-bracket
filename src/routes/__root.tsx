import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/layout'

import globalsCss from '@/styles/globals.css?url'

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Get site URL from environment variable with fallback
const getSiteUrl = () => {
  if (typeof process !== 'undefined' && process.env?.SITE_URL) {
    return process.env.SITE_URL
  }
  return 'https://taxbracketai.com'
}

const siteUrl = getSiteUrl()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
      },
      {
        title: 'TaxBracket | AI-Powered Nigerian Tax Assistant',
      },
      {
        name: 'description',
        content: 'Simplify your Nigerian tax calculations with TaxBracket. Upload bank statements, get automated tax breakdowns, and chat with our AI financial assistant.',
      },
      {
        name: 'keywords',
        content: 'Nigerian Tax, FIRS, PIT, Tax Calculator, Bank Statement Analysis, AI Finance, Lagos Tax, TaxBracket',
      },
      {
        name: 'author',
        content: 'TaxBracket',
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      {
        name: 'googlebot',
        content: 'index, follow',
      },
      // Open Graph
      {
        property: 'og:title',
        content: 'TaxBracket | AI-Powered Nigerian Tax Assistant',
      },
      {
        property: 'og:description',
        content: 'Simplify your Nigerian tax calculations with TaxBracket. Upload bank statements, get automated tax breakdowns, and chat with our AI financial assistant.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: siteUrl,
      },
      {
        property: 'og:site_name',
        content: 'TaxBracket',
      },
      {
        property: 'og:locale',
        content: 'en_NG',
      },
      {
        property: 'og:image',
        content: `${siteUrl}/og-image.png`,
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        property: 'og:image:alt',
        content: 'TaxBracket - AI-Powered Nigerian Tax Assistant',
      },
      // Twitter
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'TaxBracket | AI-Powered Nigerian Tax Assistant',
      },
      {
        name: 'twitter:description',
        content: 'Simplify your Nigerian tax calculations with TaxBracket. AI-powered analysis for Nigerian taxpayers.',
      },
      {
        name: 'twitter:image',
        content: `${siteUrl}/og-image.png`,
      },
      // PWA / Mobile
      {
        name: 'theme-color',
        content: '#16a34a', // Primary green
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'TaxBracket',
      },
      {
        name: 'application-name',
        content: 'TaxBracket',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: globalsCss,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap',
      },
      // Favicon links - multiple sizes for better browser support
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/site.webmanifest',
      },
      {
        rel: 'canonical',
        href: siteUrl,
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'TaxBracket',
          url: siteUrl,
          description: 'AI-powered financial assistant for Nigerian tax calculations and bank statement analysis',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'NGN',
          },
          publisher: {
            '@type': 'Organization',
            name: 'TaxBracket',
            url: siteUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${siteUrl}/og-image.png`,
            },
          },
          featureList: [
            'Bank Statement Upload',
            'Automated Tax Calculation',
            'Transaction Analysis',
            'AI Chat Assistant',
          ],
        }),
      },
    ],
  }),

  shellComponent: RootDocument,
})

import { Toaster } from 'sonner'

// ... existing code ...

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster position="top-center" richColors />
          </ThemeProvider>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: 'React Query',
                render: <ReactQueryDevtools />,
              },
            ]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}