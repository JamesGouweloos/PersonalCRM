"use client"

import { useEffect, useState } from "react"
import { getLeads } from "@/lib/store"
import type { Lead, LeadStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const pipelineStages: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "New", color: "bg-primary" },
  { status: "contacted", label: "Contacted", color: "bg-warning" },
  { status: "follow_up", label: "Follow Up", color: "bg-accent" },
  { status: "qualified", label: "Qualified", color: "bg-primary" },
  { status: "converted", label: "Converted", color: "bg-accent" },
]

export function PipelineOverview() {
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    const loadData = () => {
      setLeads(getLeads())
    }
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  const getCountForStage = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status).length
  }

  const totalActive = leads.filter((lead) => lead.status !== "dropped").length

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Pipeline Overview</h3>
      <div className="space-y-3">
        {pipelineStages.map((stage) => {
          const count = getCountForStage(stage.status)
          const percentage = totalActive > 0 ? (count / totalActive) * 100 : 0
          return (
            <div key={stage.status}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage.label}</span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className={cn("h-2 rounded-full transition-all", stage.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
