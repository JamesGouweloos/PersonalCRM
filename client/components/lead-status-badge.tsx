import { cn } from "@/lib/utils"
import type { LeadStatus } from "@/lib/types"

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/10 text-primary" },
  contacted: { label: "Contacted", className: "bg-warning/10 text-warning" },
  follow_up: { label: "Follow Up", className: "bg-accent/10 text-accent" },
  qualified: { label: "Qualified", className: "bg-primary/20 text-primary" },
  converted: { label: "Converted", className: "bg-accent/10 text-accent" },
  dropped: { label: "Dropped", className: "bg-destructive/10 text-destructive" },
}

interface LeadStatusBadgeProps {
  status: LeadStatus
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  )
}
