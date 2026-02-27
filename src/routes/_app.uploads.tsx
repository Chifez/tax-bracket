import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  FileText, Upload, MoreVertical, Search, Loader2, CheckCircle2,
  AlertCircle, Clock, Trash2, File, Calendar
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useRef, useCallback } from 'react'
import { useUser } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  useFileStatusPolling,
  useFileUpload,
  useDeleteFile,
  useCreateBatch,
  useTransactionSummary,
} from '@/hooks/use-uploads'

export const Route = createFileRoute('/_app/uploads')({
  component: UploadsPage,
  head: () => ({
    meta: [
      { title: 'Uploads | TaxBracket' },
      { name: 'description', content: 'Upload bank statements and manage your financial documents.' },
    ]
  })
})

// -------------------------------------------------------------------
// Status Badge
// -------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <Clock size={12} />,
      label: 'Pending',
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    },
    processing: {
      icon: <Loader2 size={12} className="animate-spin" />,
      label: 'Processing',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    completed: {
      icon: <CheckCircle2 size={12} />,
      label: 'Completed',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    failed: {
      icon: <AlertCircle size={12} />,
      label: 'Failed',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
  }

  const { icon, label, className } = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon}
      {label}
    </span>
  )
}

// -------------------------------------------------------------------
// Format Helpers
// -------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText size={16} className='text-red-500' />
  if (mimeType === 'text/csv') return <File size={16} className='text-green-500' />
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <File size={16} className='text-emerald-500' />
  return <File size={16} className="text-primary" />
}

// -------------------------------------------------------------------
// Main Page
// -------------------------------------------------------------------

function UploadsPage() {
  const { data: userData } = useUser()
  const user = userData?.user
  const currentYear = new Date().getFullYear()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data fetching
  const { data: filesData, isLoading: filesLoading } = useFileStatusPolling(selectedYear)
  const { data: summaryData } = useTransactionSummary(selectedYear)

  // Mutations
  const { uploadFile } = useFileUpload()
  const deleteFileMutation = useDeleteFile()
  const createBatchMutation = useCreateBatch()

  const files = filesData?.files || []

  // Filter files by search
  const filteredFiles = files.filter(f => {
    const name = (f.metadata as any)?.originalName || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    if (!user) {
      toast.error('You must be logged in to upload files')
      return
    }

    // Create a batch if multiple files
    let batchId: string | undefined
    if (selectedFiles.length > 1) {
      try {
        const result = await createBatchMutation.mutateAsync({
          taxYear: selectedYear,
          label: `Upload ${new Date().toLocaleDateString()}`,
        })
        batchId = result.batch.id
      } catch {
        // Continue without batch
      }
    }

    // Upload all files
    for (const file of selectedFiles) {
      uploadFile(file, {
        taxYear: selectedYear,
        batchId,
      }).catch(() => { }) // Errors handled in hook
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [user, selectedYear, uploadFile, createBatchMutation])

  // Summary stats
  const totalTransactions = summaryData?.totalTransactions || 0
  const totalIncome = summaryData?.totalIncome || 0
  const totalExpenses = summaryData?.totalExpenses || 0

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Uploads</h1>
          <p className="text-sm text-muted-foreground">
            Manage your bank statements and financial documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-card text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer text-sm font-medium"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.csv,.xls,.xlsx"
            onChange={handleFileSelect}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!user) {
                toast.error('You must be logged in to upload files')
                return
              }
              fileInputRef.current?.click()
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {totalTransactions > 0 && (
        <div className="px-6 py-4 border-b shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground font-medium">Files</p>
              <p className="text-lg font-semibold">{files.length}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground font-medium">Transactions</p>
              <p className="text-lg font-semibold">{totalTransactions.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground font-medium">Total Income</p>
              <p className="text-lg font-semibold text-emerald-600">
                ₦{totalIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
              <p className="text-lg font-semibold text-red-500">
                ₦{totalExpenses.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
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

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filesLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-4 bg-muted/50 rounded-full">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-medium">No files uploaded for {selectedYear}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your bank statements (PDF, CSV, XLS, XLSX) to get started.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First File
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-[35%]">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFiles.map((file) => {
                  const meta = file.metadata as any
                  const fileName = meta?.originalName || 'Unknown file'
                  const mimeType = meta?.mimeType || ''
                  const fileSize = meta?.size || 0

                  return (
                    <tr key={file.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-primary/10 rounded shrink-0">
                            {getFileIcon(mimeType)}
                          </div>
                          <span className="font-medium truncate max-w-[250px]" title={fileName}>
                            {fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={file.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {file.bankName || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatFileSize(fileSize)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.url && (
                              <DropdownMenuItem
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteFileMutation.mutate(file.id)}
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
