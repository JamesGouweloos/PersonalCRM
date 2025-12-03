"use client"

import { useEffect, useState } from "react"
import { getActivities, getContacts } from "@/lib/store"
import type { Activity, Contact } from "@/lib/types"
import { Mail, Phone, RefreshCw, StickyNote, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const activityIcons = {
  email_sent: Mail,
  call_made: Phone,
  status_changed: RefreshCw,
  note_added: StickyNote,
  follow_up_scheduled: Calendar,
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})

  useEffect(() => {
    const loadData = () => {
      const activitiesData = getActivities()
      const contactsData = getContacts()
      setActivities(activitiesData.slice(0, 10))
      setContacts(
        contactsData.reduce(
          (acc, contact) => {
            acc[contact.id] = contact
            return acc
          },
          {} as Record<string, Contact>,
        ),
      )
    }
    loadData()
    window.addEventListener("storage", loadData)
    return () => window.removeEventListener("storage", loadData)
  }, [])

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">No recent activity. Start by adding a lead or contact.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type]
          const contact = contacts[activity.contactId]
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {activity.description}
                  {contact && <span className="font-medium"> - {contact.name}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
