import { useState } from 'react'
import { useForgotPassword } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Loader2, ArrowLeft } from 'lucide-react'

interface ForgotPasswordViewProps {
    onBack: () => void
}

export function ForgotPasswordView({ onBack }: ForgotPasswordViewProps) {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')
    const { mutate: forgotPassword, isPending } = useForgotPassword()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        forgotPassword({ email }, {
            onSuccess: () => setSubmitted(true),
            onError: (err) => setError(err.message || 'Failed to send reset link')
        })
    }

    if (submitted) {
        return (
            <div className="flex flex-col gap-4 py-4">
                <div className="text-center space-y-2">
                    <h3 className="font-semibold">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                        We've sent a password reset link to {email}
                    </p>
                </div>
                <Button onClick={onBack} variant="outline" className="w-full">
                    Back to Login
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 py-4">
            <button
                onClick={onBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground w-fit gap-1"
            >
                <ArrowLeft size={14} /> Back
            </button>

            <div className="space-y-1">
                <h3 className="font-semibold">Reset Password</h3>
                <p className="text-sm text-muted-foreground">
                    Enter your email to receive a reset link
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                        type="email"
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Reset Link
                </Button>
            </form>
        </div>
    )
}
