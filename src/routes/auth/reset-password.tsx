import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useResetPassword } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/auth/reset-password')({
    component: ResetPasswordPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            token: typeof search.token === 'string' ? search.token : '',
        }
    },
    beforeLoad: ({ search }) => {
        if (!search.token) {
            throw redirect({ to: '/' })
        }
    }
})

function ResetPasswordPage() {
    const { token } = Route.useSearch()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const { mutate: resetPassword, isPending } = useResetPassword()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        resetPassword({ token, password }, {
            onSuccess: () => setSuccess(true),
            onError: (err) => setError(err.message || 'Failed to reset password')
        })
    }

    if (!token) return null

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
            <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-6 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Reset Password</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your new password below
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                            Password reset successfully!
                        </div>
                        <Button onClick={() => navigate({ to: '/' })} className="w-full">
                            Go to Login
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm Password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reset Password
                        </Button>
                    </form>
                )}
            </div>
        </div>
    )
}
