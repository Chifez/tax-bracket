import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Filter, MoreVertical, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChatStore } from '@/stores/chat-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export const Route = createFileRoute('/uploads')({
  component: UploadsPage
})

import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'

// ...

function UploadsPage() {
  const { uploadedFiles } = useChatStore()
  const { data } = useUser()
  const user = data?.user
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data if no files exist
  const files = uploadedFiles.length > 0 ? uploadedFiles : [
    { id: '1', name: 'Tax_Return_2023.pdf', type: 'application/pdf', size: 1024 * 1024 * 2.5, createdAt: new Date().toISOString() },
    { id: '2', name: 'W2_Form.pdf', type: 'application/pdf', size: 1024 * 500, createdAt: new Date().toISOString() },
    { id: '3', name: 'Expense_Report.csv', type: 'text/csv', size: 1024 * 100, createdAt: new Date().toISOString() },
  ]

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-10 flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Uploads</h1>
          <p className="text-sm text-muted-foreground">Manage your documents.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!user) {
              toast.error("You must be logged in to upload files")
            }
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New
        </Button>
      </div>

      <div className="px-6 py-4 shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-3 bg-muted/50 rounded-full">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-medium">No files uploaded</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload documents to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-[40%]">Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="group hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded text-primary shrink-0">
                          <FileText size={16} />
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
