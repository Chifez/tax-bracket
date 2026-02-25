import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/sidebar/theme-toggle'
import { User, Settings as SettingsIcon, Shield, Bell, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useUser } from '@/hooks/use-auth'
import { updateSettings, deleteUserAccount } from '@/server/functions/users'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: 'Settings | TaxBracket' },
      { name: 'description', content: 'Manage your account settings and preferences.' },
    ]
  })
})

function SettingsPage() {
  const { data } = useUser()
  const user = data?.user
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [allowAnalytics, setAllowAnalytics] = useState(true)
  const [allowProductUpdates, setAllowProductUpdates] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setAllowAnalytics(user.allowAnalytics ?? true)
      setAllowProductUpdates(user.allowProductUpdates ?? true)
    }
  }, [user])

  const settingsMutation = useMutation({
    mutationFn: (data: { allowAnalytics?: boolean; allowProductUpdates?: boolean }) =>
      updateSettings({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: () => {
      toast.error('Failed to save setting.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(),
    onSuccess: () => {
      queryClient.setQueryData(['user'], { user: null })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Account deleted.')
      navigate({ to: '/' })
    },
    onError: () => {
      toast.error('Failed to delete account.')
    },
  })

  const handleAnalyticsToggle = (checked: boolean) => {
    setAllowAnalytics(checked)
    settingsMutation.mutate({ allowAnalytics: checked })
  }

  const handleProductUpdatesToggle = (checked: boolean) => {
    setAllowProductUpdates(checked)
    settingsMutation.mutate({ allowProductUpdates: checked })
  }

  const handleDeleteAccount = () => {
    deleteMutation.mutate()
    setDeleteDialogOpen(false)
  }

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
                  {user && (
                    <div className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 border border-destructive/30 rounded-lg space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-destructive">Delete Account</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Permanently remove your account and all of its contents. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Account
                    </Button>
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
                    <Switch
                      checked={allowAnalytics}
                      onCheckedChange={handleAnalyticsToggle}
                      disabled={settingsMutation.isPending}
                    />
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
                    <Switch
                      checked={allowProductUpdates}
                      onCheckedChange={handleProductUpdatesToggle}
                      disabled={settingsMutation.isPending}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Deleting...</>
              ) : (
                'Yes, delete my account'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
