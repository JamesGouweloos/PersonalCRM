"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calendarAPI } from "@/lib/api"
import type { CalendarEvent, Contact } from "@/lib/types"
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  MapPin, 
  Users, 
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast, parseISO } from "date-fns"

function CalendarContent() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [contacts, setContacts] = useState<Record<string, Contact>>({})
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week for the month (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay()
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => 
    new Date(monthStart.getFullYear(), monthStart.getMonth(), -firstDayOfWeek + i + 1)
  )

  // Get days after month to fill the grid (6 rows × 7 days = 42 days)
  const totalDaysShown = 42
  const daysShown = daysBeforeMonth.length + daysInMonth.length
  const daysAfterMonth = Array.from({ length: totalDaysShown - daysShown }, (_, i) =>
    new Date(monthEnd.getFullYear(), monthEnd.getMonth(), i + 1)
  )

  const allDays = [...daysBeforeMonth, ...daysInMonth, ...daysAfterMonth]

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const startDate = format(monthStart, "yyyy-MM-dd")
      const endDate = format(monthEnd, "yyyy-MM-dd")
      
      const response = await calendarAPI.getAll({ startDate, endDate })
      setEvents(response.data || [])
    } catch (error) {
      console.error("Error loading calendar events:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const startDate = format(monthStart, "yyyy-MM-dd")
      const endDate = format(monthEnd, "yyyy-MM-dd")
      
      await calendarAPI.sync({ startDate, endDate })
      await loadEvents()
    } catch (error) {
      console.error("Error syncing calendar:", error)
      alert("Failed to sync calendar. Please ensure Outlook is connected.")
    } finally {
      setSyncing(false)
    }
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_datetime)
      return isSameDay(eventDate, date)
    })
  }

  const { todayEvents, upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date()
    const today = events.filter(e => isToday(parseISO(e.start_datetime)))
    const upcoming = events.filter(e => {
      const eventDate = parseISO(e.start_datetime)
      return eventDate > now && !isToday(eventDate)
    }).sort((a, b) => 
      parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime()
    ).slice(0, 10)
    const past = events.filter(e => {
      const eventDate = parseISO(e.start_datetime)
      return isPast(eventDate) && !isToday(eventDate)
    }).sort((a, b) => 
      parseISO(b.start_datetime).getTime() - parseISO(a.start_datetime).getTime()
    ).slice(0, 5)

    return {
      todayEvents: today,
      upcomingEvents: upcoming,
      pastEvents: past
    }
  }, [events])

  const EventCard = ({ event }: { event: CalendarEvent }) => {
    const eventDate = parseISO(event.start_datetime)
    const isPastEvent = isPast(eventDate) && !isToday(eventDate)
    
    return (
      <div
        className={`p-2 rounded border cursor-pointer hover:bg-secondary transition-colors ${
          isPastEvent ? "opacity-60" : ""
        }`}
        onClick={() => setSelectedEvent(event)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{event.subject}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(eventDate, "h:mm a")}</span>
            </div>
            {event.contact_name && (
              <p className="text-xs text-muted-foreground mt-1">{event.contact_name}</p>
            )}
          </div>
          {event.follow_up_id && (
            <Badge variant="outline" className="text-xs">
              Follow-up
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-w-0 overflow-x-hidden">
        <Header title="Calendar" subtitle="View and manage your calendar events" />
        <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
          {/* Actions */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="default"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync from Outlook"}
            </Button>
          </div>

          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="today">Today ({todayEvents.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingEvents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <Card>
                <CardContent className="p-0">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-border">
                    {/* Day headers */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {allDays.map((day, idx) => {
                      const dayEvents = getEventsForDay(day)
                      const isCurrentMonth = isSameMonth(day, currentDate)
                      const isTodayDate = isToday(day)

                      return (
                        <div
                          key={idx}
                          className={`min-h-[100px] bg-card p-1 ${
                            !isCurrentMonth ? "opacity-30" : ""
                          } ${isTodayDate ? "bg-accent/10" : ""}`}
                        >
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isTodayDate ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 truncate"
                                onClick={() => setSelectedEvent(event)}
                                title={event.subject}
                              >
                                {format(parseISO(event.start_datetime), "h:mm")} {event.subject}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-muted-foreground px-1">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="today">
              <div className="space-y-3">
                {todayEvents.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No events scheduled for today.</p>
                    </CardContent>
                  </Card>
                ) : (
                  todayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No upcoming events.</p>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.subject}</DialogTitle>
                <DialogDescription>
                  {format(parseISO(selectedEvent.start_datetime), "EEEE, MMMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(selectedEvent.start_datetime), "h:mm a")} -{" "}
                    {format(parseISO(selectedEvent.end_datetime), "h:mm a")}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedEvent.contact_name}
                      {selectedEvent.contact_email && ` (${selectedEvent.contact_email})`}
                    </span>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Attendees:</p>
                    <div className="space-y-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {attendee.name || attendee.email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.body && (
                  <div>
                    <p className="text-sm font-medium mb-2">Description:</p>
                    <div 
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEvent.body }}
                    />
                  </div>
                )}

                {selectedEvent.follow_up_id && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Linked to Follow-up
                    </Badge>
                    {selectedEvent.follow_up_completed && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                )}

                {selectedEvent.status === "cancelled" && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">This event has been cancelled</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedEvent.external_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`https://outlook.office.com/calendar/item/${selectedEvent.external_id}`, "_blank")
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Outlook
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border" />
        <main className="ml-64 min-w-0 overflow-x-hidden flex items-center justify-center">
          <div className="text-muted-foreground">Loading calendar...</div>
        </main>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  )
}


