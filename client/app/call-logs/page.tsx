"use client"


export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef , Suspense} from "react"
import { format } from "date-fns"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { callLogsAPI, callLogsUploadAPI, contactsAPI, leadsAPI } from "@/lib/api"
import { Upload, Search, Phone, Download, CheckCircle2, XCircle, AlertCircle, UserPlus, Plus } from "lucide-react"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { LeadFormDialog } from "@/components/lead-form-dialog"
import { useRouter } from "next/navigation"

interface CallLog {
  id: number
  phone_number: string
  direction: string
  duration: number
  outcome: string
  occurred_at: string
  contact_id?: number
  contact_name?: string
  contact_phone?: string
  opportunity_title?: string
  user: string
}

function CallLogsPageContent() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [showLeadDialog, setShowLeadDialog] = useState(false)
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null)
  const [matching, setMatching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }
    const handleStorageChange = () => {
      const updated = localStorage.getItem("sidebar_collapsed")
      if (updated !== null) {
        setSidebarCollapsed(updated === "true")
      }
    }
    window.addEventListener("storage", handleStorageChange)
    const interval = setInterval(handleStorageChange, 500)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadCallLogs = async () => {
    try {
      setLoading(true)
      const response = await callLogsAPI.getAll()
      setCallLogs(response.data || [])
    } catch (error) {
      console.error("Error loading call logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCallLogs()
  }, [])

  const filteredCallLogs = callLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contact_phone?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const getDirectionBadge = (direction: string) => {
    return direction === "inbound" ? (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
        Inbound
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
        Outbound
      </Badge>
    )
  }

  const getOutcomeBadge = (outcome: string) => {
    if (!outcome) return <span className="text-muted-foreground">-</span>
    
    const outcomeColors: Record<string, string> = {
      answered: "bg-green-500/10 text-green-500",
      missed: "bg-red-500/10 text-red-500",
      no_answer: "bg-yellow-500/10 text-yellow-500",
    }

    return (
      <Badge variant="secondary" className={outcomeColors[outcome] || "bg-gray-500/10 text-gray-500"}>
        {outcome.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    )
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)

    try {
      const response = await callLogsUploadAPI.upload(file)
      setUploadResult(response.data)
      await loadCallLogs()
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Error uploading file:", error)
      setUploadResult({
        success: false,
        error: error.response?.data?.error || error.message || "Failed to upload file",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleMatchUnknown = async () => {
    setMatching(true)
    try {
      const response = await callLogsAPI.matchUnknown()
      setUploadResult({
        success: true,
        imported: response.data.updated,
        skipped: response.data.checked - response.data.updated,
        message: `Matched ${response.data.matched} phone numbers and updated ${response.data.updated} call logs`
      })
      await loadCallLogs()
    } catch (error: any) {
      console.error("Error matching unknown callers:", error)
      setUploadResult({
        success: false,
        error: error.response?.data?.error || error.message || "Failed to match unknown callers",
      })
    } finally {
      setMatching(false)
    }
  }

  const handleCreateContact = (callLog: CallLog) => {
    setSelectedCallLog(callLog)
    setShowContactDialog(true)
  }

  const handleCreateLead = (callLog: CallLog) => {
    setSelectedCallLog(callLog)
    setShowLeadDialog(true)
  }

  const handleContactSave = async () => {
    await loadCallLogs()
    setShowContactDialog(false)
    setSelectedCallLog(null)
  }

  const handleLeadSave = async () => {
    await loadCallLogs()
    setShowLeadDialog(false)
    setSelectedCallLog(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={`${sidebarCollapsed ? "ml-16" : "ml-64"} min-w-0 overflow-x-hidden`} style={{ transition: "margin-left 0.3s" }}>
        <Header title="Call Logs" subtitle="View and manage imported call logs" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search call logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-10 w-full"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={handleMatchUnknown}
                disabled={matching}
                className="whitespace-nowrap"
              >
                {matching ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Matching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Match Unknown
                  </>
                )}
              </Button>
              <Button onClick={() => setShowUploadDialog(true)} className="whitespace-nowrap">
                <Upload className="mr-2 h-4 w-4" />
                Upload Call Logs
              </Button>
            </div>
          </div>

          {/* Upload Result Alert */}
          {uploadResult && (
            <div className={`mb-4 p-4 rounded-lg border ${
              uploadResult.success 
                ? "bg-green-500/10 border-green-500/20 text-green-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            }`}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <div className="flex-1">
                  {uploadResult.success ? (
                    <div>
                      <p className="font-medium">Upload Successful</p>
                      <p className="text-sm">
                        Imported {uploadResult.imported} call logs
                        {uploadResult.skipped > 0 && `, skipped ${uploadResult.skipped} duplicates`}
                      </p>
                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <p className="text-sm mt-1">
                          {uploadResult.errors.length} error(s) occurred
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Upload Failed</p>
                      <p className="text-sm">{uploadResult.error || uploadResult.message}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUploadResult(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Call Logs Table */}
          <div className="rounded-xl border border-border bg-card w-full overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[1000px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground min-w-[140px]">Date & Time</TableHead>
                    <TableHead className="text-muted-foreground min-w-[150px]">Contact</TableHead>
                    <TableHead className="text-muted-foreground min-w-[130px]">Phone Number</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Direction</TableHead>
                    <TableHead className="text-muted-foreground min-w-[80px]">Duration</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">Outcome</TableHead>
                    <TableHead className="text-muted-foreground min-w-[100px]">User</TableHead>
                    <TableHead className="text-muted-foreground w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading call logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCallLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No call logs found. Upload a call log XML file to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCallLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground min-w-[140px] whitespace-nowrap">
                          {format(new Date(log.occurred_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground min-w-[150px] max-w-[200px] truncate" title={log.contact_name || undefined}>
                          {log.contact_name || "(Unknown)"}
                        </TableCell>
                        <TableCell className="text-muted-foreground min-w-[130px] truncate" title={log.phone_number}>
                          {log.phone_number}
                        </TableCell>
                        <TableCell className="min-w-[100px]">{getDirectionBadge(log.direction)}</TableCell>
                        <TableCell className="text-muted-foreground min-w-[80px] whitespace-nowrap">
                          {formatDuration(log.duration)}
                        </TableCell>
                        <TableCell className="min-w-[100px]">{getOutcomeBadge(log.outcome)}</TableCell>
                        <TableCell className="text-muted-foreground min-w-[100px] whitespace-nowrap">{log.user}</TableCell>
                        <TableCell className="w-[150px]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {!log.contact_id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCreateContact(log)}
                                  title="Create Contact"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCreateLead(log)}
                                  title="Create Lead"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {log.contact_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/contacts?highlight=${log.contact_id}`)}
                                title="View Contact"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Call Logs</DialogTitle>
            <DialogDescription>
              Upload an XML file exported from SMS Backup & Restore. Only calls with subscription_id="2" will be imported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Select XML File
              </label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Processing file...</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false)
                  setUploadResult(null)
                }}
                disabled={uploading}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Contact Dialog */}
      {selectedCallLog && (
        <ContactFormDialog
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          existingContact={{
            id: "",
            name: selectedCallLog.contact_name || "",
            email: "",
            phone: selectedCallLog.phone_number,
            company: "",
            notes: `Created from call log: ${format(new Date(selectedCallLog.occurred_at), "MMM d, yyyy HH:mm")}`,
            contact_type: "Agent",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          onSave={handleContactSave}
        />
      )}

      {/* Create Lead Dialog */}
      {selectedCallLog && (
        <LeadFormDialog
          open={showLeadDialog}
          onOpenChange={setShowLeadDialog}
          existingContact={selectedCallLog.contact_id ? {
            id: selectedCallLog.contact_id.toString(),
            name: selectedCallLog.contact_name || "",
            email: "",
            phone: selectedCallLog.phone_number,
            company: "",
            notes: "",
            contact_type: "Agent",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } : {
            id: "",
            name: selectedCallLog.contact_name || "",
            email: "",
            phone: selectedCallLog.phone_number,
            company: "",
            notes: `Created from call log: ${format(new Date(selectedCallLog.occurred_at), "MMM d, yyyy HH:mm")}`,
            contact_type: "Agent",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          onSave={handleLeadSave}
        />
      )}
    </div>
  )
}




export default function CallLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" /><main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></main></div>}>
      <CallLogsPageContent />
    </Suspense>
  )
}