import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import { ThemeToggle } from './theme-toggle'
import { User, Settings, Shield, Bell } from 'lucide-react'

interface SettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className=" max-sm:w-full sm:max-w-[600px] h-[500px] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Settings</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-48 border-r bg-muted/30 p-2 shrink-0">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                <TabsTrigger
                                    value="general"
                                    className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                >
                                    <Settings size={16} />
                                    <span>General</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="account"
                                    className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                >
                                    <User size={16} />
                                    <span>Account</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="privacy"
                                    className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                >
                                    <Shield size={16} />
                                    <span>Privacy</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="notifications"
                                    className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                >
                                    <Bell size={16} />
                                    <span>Notifications</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <TabsContent value="general" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Appearance</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Theme</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Select your preferred theme
                                            </p>
                                        </div>
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="account" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Profile</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage your account settings.
                                    </p>
                                    <Button variant="outline">Delete Account</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="privacy" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Data Collection</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Analytics</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Allow us to collect anonymous usage data
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="notifications" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Email Notifications</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Product Updates</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Receive updates about new features
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
