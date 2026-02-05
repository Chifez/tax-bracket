import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { handleGoogleCallback } from '@/server/functions/oauth'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/auth/google/callback')({
    component: GoogleCallbackPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            code: typeof search.code === 'string' ? search.code : '',
            error: typeof search.error === 'string' ? search.error : '',
        }
    },
})

function GoogleCallbackPage() {
    const { code, error } = Route.useSearch()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [status, setStatus] = useState<'processing' | 'error'>('processing')

    useEffect(() => {
        if (error) {
            setStatus('error')
            return
        }

        if (code) {
            handleGoogleCallback({ data: { code } })
                .then((result) => {
                    queryClient.setQueryData(['user'], { user: result.user })
                    navigate({ to: '/' })
                })
                .catch((err) => {
                    console.error('Google Auth Error:', err)
                    setStatus('error')
                })
        }
    }, [code, error, navigate, queryClient])

    if (status === 'error') {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-destructive mb-2">Authentication Failed</h2>
                    <p className="text-muted-foreground mb-4">Could not sign in with Google.</p>
                    <button
                        onClick={() => navigate({ to: '/' })}
                        className="text-primary hover:underline"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    )
}
