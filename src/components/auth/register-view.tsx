import { useState } from 'react'
import { useRegister } from '@/hooks/use-auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { RegisterInput } from '@/server/validators/auth'

interface RegisterViewProps {
    onLoginClick: () => void
    onSuccess: () => void
}

export function RegisterView({ onLoginClick, onSuccess }: RegisterViewProps) {
    const [formData, setFormData] = useState<RegisterInput>({ email: '', password: '', name: '' })
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const { mutate: register, isPending } = useRegister()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (formData.password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        console.log('formData', formData)

        register(formData, {
            onSuccess: () => onSuccess(),
            onError: (err) => setError(err.message || 'Failed to register')
        })
    }

    return (
        <div className="flex flex-col gap-4 py-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>
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
                    <label className="text-sm font-medium">Password</label>
                    <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    Create Account
                </Button>
            </form>

            <div className="text-center text-sm">
                Already have an account?{' '}
                <button
                    onClick={onLoginClick}
                    className="underline hover:text-primary"
                >
                    Log in
                </button>
            </div>
        </div>
    )
}
