"use client";

import { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, RefreshCw, Trash2, Tag, Building2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

export default function SchedulePage() {
  const { user } = useAuthStore();
  const canManageEvents = user?.role === "admin" || user?.role === "staff";

  const calendarRef = useRef<FullCalendar>(null);
  
  const [events, setEvents] = useState<any[]>([]);

  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [eventsRes, deptsRes, usersRes] = await Promise.all([
          api.get("/events"),
          api.get("/departments").catch(() => ({ data: { status: "error", data: [] } })),
          api.get("/users").catch(() => ({ data: { status: "error", data: [] } }))
        ]);
        
        if (eventsRes.data?.status === "success") {
          const eventsList = Array.isArray(eventsRes.data.data) ? eventsRes.data.data : (eventsRes.data.data.data || []);
          const mappedEvents = eventsList.map((e: any) => ({
            id: e.id,
            title: e.title,
            start: e.start_date,
            end: e.end_date,
            backgroundColor: e.color || "#3b82f6",
            borderColor: e.color || "#3b82f6",
          }));
          setEvents(mappedEvents);
        }

        if (deptsRes.data?.status === "success") {
          setDepartments(deptsRes.data.data);
        }

        if (usersRes.data?.status === "success") {
          const usersList = Array.isArray(usersRes.data.data) ? usersRes.data.data : (usersRes.data.data.data || []);
          setUsers(usersList);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load initial data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState("none");
  const [newEventColor, setNewEventColor] = useState("#3b82f6");
  const [newEventDepartmentId, setNewEventDepartmentId] = useState("");
  const [newEventTaggedUsers, setNewEventTaggedUsers] = useState<string[]>([]);
  const [newEventExternalParticipants, setNewEventExternalParticipants] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // View event modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDateClick = (arg: any) => {
    if (!canManageEvents) return;
    
    const d = arg.date;
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, -1);
    
    const dateStr = localISOTime.split("T")[0];
    const timeStr = localISOTime.split("T")[1].substring(0, 5);

    // Default end time to 1 hour later
    const startHour = parseInt(timeStr.split(":")[0], 10);
    const endHourStr = String((startHour + 1) % 24).padStart(2, '0');
    const endTimeStr = timeStr === "00:00" ? "10:00" : `${endHourStr}:${timeStr.split(":")[1]}`;

    setNewEventTitle("");
    setNewEventDate(dateStr);
    setNewEventTime(timeStr === "00:00" ? "09:00" : timeStr);
    setNewEventEndTime(endTimeStr);
    setNewEventDescription("");
    setNewEventRecurrence("none");
    setNewEventColor("#3b82f6");
    setNewEventDepartmentId("");
    setNewEventTaggedUsers([]);
    setNewEventExternalParticipants("");
    setEditingEventId(null);
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    
    const startObj = new Date(selectedEvent.start_date);
    const endObj = new Date(selectedEvent.end_date);
    
    const year = startObj.getFullYear();
    const month = String(startObj.getMonth() + 1).padStart(2, '0');
    const day = String(startObj.getDate()).padStart(2, '0');
    const hours = String(startObj.getHours()).padStart(2, '0');
    const minutes = String(startObj.getMinutes()).padStart(2, '0');

    const endHours = String(endObj.getHours()).padStart(2, '0');
    const endMinutes = String(endObj.getMinutes()).padStart(2, '0');
    
    setNewEventTitle(selectedEvent.title || "");
    setNewEventDate(`${year}-${month}-${day}`);
    setNewEventTime(`${hours}:${minutes}`);
    setNewEventEndTime(`${endHours}:${endMinutes}`);
    setNewEventDescription(selectedEvent.description || "");
    setNewEventRecurrence(selectedEvent.recurrence || "none");
    setNewEventColor(selectedEvent.color || "#3b82f6");
    setNewEventDepartmentId(selectedEvent.department_id || "");
    
    setNewEventTaggedUsers(selectedEvent.tagged_users ? selectedEvent.tagged_users.map((u:any) => u.id) : []);
    setNewEventExternalParticipants(selectedEvent.external_participants ? selectedEvent.external_participants.join(", ") : "");
    
    setEditingEventId(selectedEvent.id);
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!newEventTitle || !newEventDate || !newEventTime) {
      toast.error("Please fill in all required fields before saving.");
      return;
    }

    const [year, month, day] = newEventDate.split("-").map(Number);
    const [hours, minutes] = newEventTime.split(":").map(Number);
    
    // If end time is not set, default to 1 hour after start
    let endHours = hours + 1;
    let endMinutes = minutes;
    if (newEventEndTime) {
      [endHours, endMinutes] = newEventEndTime.split(":").map(Number);
    }

    const start = new Date(year, month - 1, day, hours, minutes);
    let end = new Date(year, month - 1, day, endHours, endMinutes);
    
    // If end time is before start time (e.g. crossing midnight), add 1 day to end
    if (end < start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    setIsSaving(true);
    try {
      const payload = {
        title: newEventTitle,
        description: newEventDescription || null,
        recurrence: newEventRecurrence === "none" ? null : newEventRecurrence,
        color: newEventColor,
        department_id: newEventDepartmentId || null,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        tagged_users: newEventTaggedUsers,
        external_participants: newEventExternalParticipants
          ? newEventExternalParticipants.split(",").map(e => e.trim()).filter(Boolean)
          : [],
      };
      
      let response;
      if (editingEventId) {
        response = await api.put(`/events/${editingEventId}`, payload);
      } else {
        response = await api.post("/events", payload);
      }
      
      if (response.data?.status === "success") {
        const e = response.data.data;
        const newEventObj = {
          id: e.id,
          title: e.title,
          start: e.start_date,
          end: e.end_date,
          backgroundColor: e.color || "#10b981",
          borderColor: e.color || "#10b981",
        };

        if (editingEventId) {
          setEvents(events.map(ev => ev.id === editingEventId ? newEventObj : ev));
          toast.success("Event updated successfully!");
        } else {
          setEvents([...events, newEventObj]);
          toast.success("Event created successfully!");
        }
        
        setIsModalOpen(false);
        setEditingEventId(null);
      }
    } catch (error: any) {
      console.error("Failed to save event", error);
      toast.error(error.response?.data?.message || error.message || "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventDrop = async (arg: any) => {
    if (!canManageEvents) {
      arg.revert();
      toast.error("You don't have permission to modify events.");
      return;
    }
  };

  const handleEventClick = async (arg: any) => {
    try {
      const response = await api.get(`/events/${arg.event.id}`);
      if (response.data?.status === "success") {
        setSelectedEvent(response.data.data);
      } else {
        setSelectedEvent({
          id: arg.event.id,
          title: arg.event.title,
          start_date: arg.event.startStr,
          end_date: arg.event.endStr,
          color: arg.event.backgroundColor,
        });
      }
    } catch {
      setSelectedEvent({
        id: arg.event.id,
        title: arg.event.title,
        start_date: arg.event.startStr,
        end_date: arg.event.endStr,
        color: arg.event.backgroundColor,
      });
    }
    setIsViewModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    try {
      await api.delete(`/events/${selectedEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setIsViewModalOpen(false);
      setIsConfirmingDelete(false);
      setSelectedEvent(null);
      toast.success("Event deleted successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-semibold tracking-tight"
          >
            Calendar
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-muted-foreground"
          >
            Manage department schedules and city events.
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {canManageEvents && (
            <Button 
              className="rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => handleDateClick({ date: new Date() })}
            >
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex-1 min-h-[600px]"
      >
        <Card className="p-4 md:p-6 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl [&_.fc-theme-standard]:border-black/5 dark:[&_.fc-theme-standard]:border-white/5 [&_.fc-col-header-cell]:py-2 [&_.fc-col-header-cell]:font-medium dark:[&_th.fc-col-header-cell]:!bg-transparent dark:[&_.fc-theme-standard_th]:!bg-transparent [&_.fc-day-today]:!bg-blue-500/10 dark:[&_.fc-day-today]:!bg-blue-500/20 overflow-hidden dark:[&_.fc-col-header-cell-cushion]:!text-zinc-100 dark:[&_.fc-daygrid-day-number]:!text-zinc-100 dark:[&_.fc-toolbar-title]:!text-zinc-100 dark:[&_th]:!border-white/5 [&_td.fc-day]:!bg-white/90 dark:[&_td.fc-day]:!bg-white/10 [&_td.fc-day-other]:!bg-black/5 dark:[&_td.fc-day-other]:!bg-transparent [&_.fc-daygrid-day-top]:flex [&_.fc-daygrid-day-top]:justify-end [&_.fc-daygrid-day-top]:p-1 [&_.fc-daygrid-day-events]:p-1 [&_td.fc-day-today]:!bg-blue-500/20 dark:[&_td.fc-day-today]:!bg-blue-500/30 [&_.fc-event]:!border-dashed [&_.fc-event]:!border-2 [&_.fc-event-main]:p-1 [&_.fc-event-main-frame]:!items-start [&_.fc-event-time]:!mr-1 [&_.fc-event-title]:!whitespace-normal [&_.fc-event-title]:!break-words [&_.fc-event-title]:!font-normal">
          {isLoading ? (
            <div className="animate-pulse flex flex-col h-[600px] w-full bg-white dark:bg-black rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
              {/* Header skeleton */}
              <div className="flex justify-between items-center p-4 border-b border-black/5 dark:border-white/5">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                  <div className="w-8 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                  <div className="w-16 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                </div>
                <div className="w-32 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                <div className="flex gap-1">
                  <div className="w-16 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                  <div className="w-16 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                  <div className="w-16 h-8 rounded-md bg-black/10 dark:bg-white/10" />
                </div>
              </div>
              {/* Grid skeleton */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-black/5 dark:bg-white/5 p-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="bg-white/50 dark:bg-black/50 p-2">
                    <div className="w-6 h-4 bg-black/10 dark:bg-white/10 rounded ml-auto mb-2" />
                    {i % 7 === 2 && i < 14 && <div className="w-full h-5 bg-blue-500/20 rounded mb-1" />}
                    {i % 7 === 4 && i > 14 && <div className="w-full h-5 bg-purple-500/20 rounded mb-1" />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              editable={canManageEvents}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              allDaySlot={false}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
            />
          )}
        </Card>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingEventId(null); }}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>{editingEventId ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {editingEventId ? "Update the details of your event." : "Schedule a new event. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Event title..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endtime">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endtime"
                  type="time"
                  value={newEventEndTime}
                  onChange={(e) => setNewEventEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description
              </Label>
              <textarea
                id="description"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Event details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">
                  Department
                </Label>
                <select
                  id="department"
                  value={newEventDepartmentId}
                  onChange={(e) => setNewEventDepartmentId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-black"
                >
                  <option value="" className="dark:bg-slate-900">No Department (General)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="dark:bg-slate-900">{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="recurrence">
                  Recurrence
                </Label>
                <select
                  id="recurrence"
                  value={newEventRecurrence}
                  onChange={(e) => setNewEventRecurrence(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-black"
                >
                  <option value="none" className="dark:bg-slate-900">None</option>
                  <option value="daily" className="dark:bg-slate-900">Daily</option>
                  <option value="weekly" className="dark:bg-slate-900">Weekly</option>
                  <option value="monthly" className="dark:bg-slate-900">Monthly</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="grid gap-2">
                <Label>Internal Participants</Label>
                <div className="flex w-full flex-col max-h-[140px] overflow-y-auto rounded-md border border-input bg-transparent p-1 text-sm shadow-sm dark:bg-black/20">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors">
                      <input
                        type="checkbox"
                        checked={newEventTaggedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEventTaggedUsers(prev => [...prev, user.id]);
                          } else {
                            setNewEventTaggedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-input bg-background accent-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="truncate">{user.first_name} {user.last_name} <span className="text-muted-foreground hidden sm:inline">({user.email})</span></span>
                    </label>
                  ))}
                  {users.length === 0 && (
                    <div className="p-2 text-muted-foreground text-center text-xs">No users available</div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">Select users from your organization.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="external_participants">
                  External Participants
                </Label>
                <Input
                  id="external_participants"
                  value={newEventExternalParticipants}
                  onChange={(e) => setNewEventExternalParticipants(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Comma-separated email addresses.</p>
                
                <div className="mt-2">
                  <Label htmlFor="color" className="block mb-2">
                    Event Color
                  </Label>
                  <Input
                    id="color"
                    type="color"
                    value={newEventColor}
                    onChange={(e) => setNewEventColor(e.target.value)}
                    className="h-10 w-full px-1 py-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingEventId(null); }} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "Saving Event..." : (editingEventId ? "Update Event" : "Save Event")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              {selectedEvent?.color && (
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedEvent.color }}
                />
              )}
              <DialogTitle className="text-xl leading-tight">{selectedEvent?.title}</DialogTitle>
            </div>
            <DialogDescription>Event details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedEvent?.description && (
              <div className="flex gap-3 text-sm">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <p className="font-medium">Description</p>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Start</p>
                <p className="text-muted-foreground">
                  {selectedEvent?.start_date
                    ? new Date(selectedEvent.start_date).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">End</p>
                <p className="text-muted-foreground">
                  {selectedEvent?.end_date
                    ? new Date(selectedEvent.end_date).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>

            {selectedEvent?.recurrence && selectedEvent.recurrence !== "none" && (
              <div className="flex gap-3 text-sm">
                <RefreshCw className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Recurrence</p>
                  <p className="text-muted-foreground capitalize">{selectedEvent.recurrence}</p>
                </div>
              </div>
            )}

            {selectedEvent?.department_id && (
              <div className="flex gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Department</p>
                  <p className="text-muted-foreground">
                    {departments.find((d) => d.id === selectedEvent.department_id)?.name || selectedEvent.department_id}
                  </p>
                </div>
              </div>
            )}

            {((selectedEvent?.tagged_users && selectedEvent.tagged_users.length > 0) || (selectedEvent?.external_participants && selectedEvent.external_participants.length > 0)) && (
              <div className="flex gap-3 text-sm border-t pt-4 mt-2 border-black/5 dark:border-white/10">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <p className="font-medium mb-2">Participants</p>
                  
                  {selectedEvent?.tagged_users && selectedEvent.tagged_users.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Internal Users</p>
                      <div className="flex flex-col gap-1.5">
                        {selectedEvent.tagged_users.map((user: any) => (
                          <div key={user.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center text-xs font-medium">
                              {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                            </div>
                            <span className="text-sm">{user.first_name} {user.last_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent?.external_participants && selectedEvent.external_participants.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">External Guests</p>
                      <div className="flex flex-col gap-1.5">
                        {selectedEvent.external_participants.map((email: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center text-xs font-medium">
                              @
                            </div>
                            <span className="text-sm">{email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            {!canManageEvents ? (
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            ) : isConfirmingDelete ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Yes, Delete Event"}
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={handleEditClick} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setIsConfirmingDelete(true)} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
