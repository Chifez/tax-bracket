'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { queueSupportEmail } from '@/server/functions/email'
import { CheckCircle2, Loader2, HelpCircle, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/hooks/use-auth'

interface SupportModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: 'support' | 'feedback'
}

export function SupportModal({ open, onOpenChange, type }: SupportModalProps) {
    const { data } = useUser()
    const user = data?.user

    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const isSupport = type === 'support'
    const title = isSupport ? 'Help & Support' : 'Send Feedback'
    const Icon = isSupport ? HelpCircle : MessageSquarePlus
    const placeholder = isSupport
        ? 'Describe the issue you\'re experiencing in detail...'
        : 'Share your thoughts, suggestions, or feature requests...'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        try {
            await queueSupportEmail({
                data: {
                    fromName: user.name,
                    fromEmail: user.email,
                    type,
                    subject,
                    message,
                },
            })
            setSent(true)
        } catch {
            toast.error('Failed to send. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = (open: boolean) => {
        if (!open) {
            setTimeout(() => {
                setSubject('')
                setMessage('')
                setSent(false)
            }, 300)
        }
        onOpenChange(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Icon size={18} strokeWidth={1.75} className="text-muted-foreground" />
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {isSupport
                            ? 'Describe your issue and our team will get back to you.'
                            : 'We read every message and use your feedback to improve TaxBracket.'}
                    </DialogDescription>
                </DialogHeader>

                {sent ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <CheckCircle2 size={40} strokeWidth={1.5} className="text-green-500" />
                        <p className="font-medium">
                            {isSupport ? 'Support request sent!' : 'Feedback received!'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {isSupport
                                ? 'We\'ll get back to you at ' + user?.email + ' as soon as possible.'
                                : 'Thank you for helping us improve TaxBracket.'}
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => handleClose(false)}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="support-subject">Subject</Label>
                            <Input
                                id="support-subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={isSupport ? 'e.g. Login issue, billing question...' : 'e.g. Feature idea, UI suggestion...'}
                                required
                                maxLength={200}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="support-message">Message</Label>
                            <Textarea
                                id="support-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={placeholder}
                                required
                                minLength={10}
                                maxLength={5000}
                                rows={5}
                                className="resize-none"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">{message.length}/5000</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={loading || !subject || message.length < 10}>
                                {loading ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Sending...</> : 'Send'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
