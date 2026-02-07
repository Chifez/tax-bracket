import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Filter, Grid, List as ListIcon, MoreVertical, Search } from 'lucide-react'
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

function UploadsPage() {
  const { uploadedFiles } = useChatStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uploads</h1>
          <p className="text-sm text-muted-foreground">Manage your uploaded documents and files.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Upload New</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 border rounded-md p-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'grid' && "bg-muted")}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", viewMode === 'list' && "bg-muted")}
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-4 bg-muted/50 rounded-full">
              <Upload className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No files uploaded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                Upload documents to get started. You can analyze them using the chat.
              </p>
            </div>
            <Button variant="outline">Upload your first file</Button>
          </div>
        ) : (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {filteredFiles.map((file) => (
              <Card key={file.id} className={cn("group hover:shadow-md transition-shadow", viewMode === 'list' && "flex items-center p-4")}>
                {viewMode === 'grid' ? (
                  <>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium truncate max-w-[200px] sm:max-w-md" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Rename</DropdownMenuItem>
                        <DropdownMenuItem>Download</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
