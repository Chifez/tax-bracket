import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { LoginView } from './login-view'
import { RegisterView } from './register-view'
import { ForgotPasswordView } from './forgot-password-view'

export type AuthView = 'login' | 'register' | 'forgot-password'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    initialView?: AuthView
}

export function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
    const [view, setView] = useState<AuthView>(initialView)

    const handleSuccess = () => {
        onClose()
    }

    const getTitle = () => {
        switch (view) {
            case 'login': return 'Welcome Back'
            case 'register': return 'Create Account'
            case 'forgot-password': return 'Reset Password'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>

                {view === 'login' && (
                    <LoginView
                        onRegisterClick={() => setView('register')}
                        onForgotClick={() => setView('forgot-password')}
                        onSuccess={handleSuccess}
                    />
                )}

                {view === 'register' && (
                    <RegisterView
                        onLoginClick={() => setView('login')}
                        onSuccess={handleSuccess}
                    />
                )}

                {view === 'forgot-password' && (
                    <ForgotPasswordView
                        onBack={() => setView('login')}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
