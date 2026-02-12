import { createFileRoute } from '@tanstack/react-router'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/sidebar/theme-toggle'
import { User, Settings as SettingsIcon, Shield, Bell } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: 'Settings | TaxBracket' },
      { name: 'description', content: 'Manage your account settings and preferences.' },
    ]
  })
})

function SettingsPage() {
  return (
    <div className="p-10 flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences.</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Tabs defaultValue="general" className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <aside className="w-full md:w-56 border-r bg-muted/10 shrink-0 overflow-y-auto">
            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-2 w-full justify-start">
              <TabsTrigger
                value="general"
                className="w-full justify-start gap-3 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md"
              >
                <SettingsIcon size={16} strokeWidth={1.75} />
                <span className="text-sm">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="w-full justify-start gap-3 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md"
              >
                <User size={16} strokeWidth={1.75} />
                <span className="text-sm">Account</span>
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="w-full justify-start gap-3 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md"
              >
                <Shield size={16} strokeWidth={1.75} />
                <span className="text-sm">Privacy</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="w-full justify-start gap-3 px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md"
              >
                <Bell size={16} strokeWidth={1.75} />
                <span className="text-sm">Notifications</span>
              </TabsTrigger>
            </TabsList>
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
              <TabsContent value="general" className="mt-0 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Theme</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Select your preferred theme
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="account" className="mt-0 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Profile</h3>
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Delete Account</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Permanently remove your account and all of its contents. This action cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="text-xs">Delete Account</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="mt-0 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Collection</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Analytics</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Allow us to collect anonymous usage data to improve the experience.
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-0 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Notifications</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Product Updates</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Receive updates about new features and improvements.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
