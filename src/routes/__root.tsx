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
        content: 'https://taxbracketai.com', // Placeholder
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
        content: '/og-image.png',
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
        content: '/og-image.png',
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
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'TaxBracket',
          url: 'https://taxbracketai.com',
          publisher: {
            '@type': 'Organization',
            name: 'TaxBracket',
            url: 'https://taxbracketai.com',
            logo: 'https://taxbracketai.com/logo.png', // Placeholder
            sameAs: [
              'https://twitter.com/taxbracket_ng', // Placeholder
            ],
          },
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