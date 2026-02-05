import { useState } from 'react'
import { useLogin } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { LoginInput } from '@/server/validators/auth'

interface LoginViewProps {
    onRegisterClick: () => void
    onForgotClick: () => void
    onSuccess: () => void
}

export function LoginView({ onRegisterClick, onForgotClick, onSuccess }: LoginViewProps) {
    const [formData, setFormData] = useState<LoginInput>({ email: '', password: '' })
    const [error, setError] = useState('')
    const { mutate: login, isPending } = useLogin()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        login(formData, {
            onSuccess: () => onSuccess(),
            onError: (err) => setError(err.message || 'Failed to login')
        })
    }

    return (
        <div className="flex flex-col gap-4 py-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Password</label>
                        <button
                            type="button"
                            onClick={onForgotClick}
                            className="text-xs text-muted-foreground hover:text-primary"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <Input
                        type="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Log in
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>

            <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                    try {
                        const { getGoogleAuthUrl } = await import('@/server/functions/oauth')
                        const { url } = await getGoogleAuthUrl()
                        window.location.href = url
                    } catch (error) {
                        console.error('Failed to get Google Auth URL', error)
                    }
                }}
            >
                <span className="mr-2">Google</span>
            </Button>

            <div className="text-center text-sm">
                Don't have an account?{' '}
                <button
                    onClick={onRegisterClick}
                    className="underline hover:text-primary"
                >
                    Sign up
                </button>
            </div>
        </div>
    )
}
