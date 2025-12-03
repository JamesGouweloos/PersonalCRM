import { cn } from "@/lib/utils"
import type { LeadSource } from "@/lib/types"
import { Globe, Phone, Share2, RotateCcw, UserCheck, Forward } from "lucide-react"

const sourceConfig: Record<LeadSource, { label: string; icon: typeof Globe; className: string }> = {
  webform: { label: "Webform", icon: Globe, className: "bg-primary/10 text-primary" },
  cold_call: { label: "Cold Call", icon: Phone, className: "bg-warning/10 text-warning" },
  social_media: { label: "Social Media", icon: Share2, className: "bg-accent/10 text-accent" },
  previous_enquiry: { label: "Previous Enquiry", icon: RotateCcw, className: "bg-muted text-muted-foreground" },
  previous_client: { label: "Previous Client", icon: UserCheck, className: "bg-primary/10 text-primary" },
  forwarded: { label: "Forwarded", icon: Forward, className: "bg-secondary text-secondary-foreground" },
}

interface LeadSourceBadgeProps {
  source: LeadSource
}

export function LeadSourceBadge({ source }: LeadSourceBadgeProps) {
  const config = sourceConfig[source]
  const Icon = config.icon

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
