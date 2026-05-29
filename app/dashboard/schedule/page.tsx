"use client";

import { useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, RefreshCw, Trash2, Tag, Building2 } from "lucide-react";
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

export default function SchedulePage() {
  const calendarRef = useRef<FullCalendar>(null);
  
  const [events, setEvents] = useState<any[]>([]);

  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, deptsRes] = await Promise.all([
          api.get("/events"),
          api.get("/departments").catch(() => ({ data: { status: "error", data: [] } }))
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
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load initial data.");
      }
    };
    fetchData();
  }, []);
  


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState("none");
  const [newEventColor, setNewEventColor] = useState("#3b82f6");
  const [newEventDepartmentId, setNewEventDepartmentId] = useState("");

  // View event modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDateClick = (arg: any) => {
    const d = arg.date;
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, -1);
    
    const dateStr = localISOTime.split("T")[0];
    const timeStr = localISOTime.split("T")[1].substring(0, 5);

    setNewEventTitle("");
    setNewEventDate(dateStr);
    setNewEventTime(timeStr === "00:00" ? "09:00" : timeStr);
    setNewEventDescription("");
    setNewEventRecurrence("none");
    setNewEventColor("#3b82f6");
    setNewEventDepartmentId("");
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!newEventTitle || !newEventDate || !newEventTime) {
      toast.error("Please fill in all required fields before saving.");
      return;
    }

    const [year, month, day] = newEventDate.split("-").map(Number);
    const [hours, minutes] = newEventTime.split(":").map(Number);

    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

    try {
      const payload = {
        title: newEventTitle,
        description: newEventDescription || null,
        recurrence: newEventRecurrence === "none" ? null : newEventRecurrence,
        color: newEventColor,
        department_id: newEventDepartmentId || null,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      };
      
      const response = await api.post("/events", payload);
      
      if (response.data?.status === "success") {
        const e = response.data.data;
        setEvents([
          ...events,
          {
            id: e.id,
            title: e.title,
            start: e.start_date,
            end: e.end_date,
            backgroundColor: e.color || "#10b981",
            borderColor: e.color || "#10b981",
          },
        ]);
        setIsModalOpen(false);
        toast.success("Event created successfully!");
      }
    } catch (error: any) {
      console.error("Failed to save event", error);
      toast.error(error.response?.data?.message || error.message || "Failed to save event");
    }
  };

  const handleEventClick = async (arg: any) => {
    try {
      const response = await api.get(`/events/${arg.event.id}`);
      if (response.data?.status === "success") {
        setSelectedEvent(response.data.data);
      } else {
        // fallback to calendar event data
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
    try {
      await api.delete(`/events/${selectedEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setIsViewModalOpen(false);
      setIsConfirmingDelete(false);
      setSelectedEvent(null);
      toast.success("Event deleted successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete event");
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
          <Button 
            className="rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={() => handleDateClick({ date: new Date() })}
          >
            <Plus className="w-4 h-4" />
            New Event
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex-1 min-h-[600px]"
      >
        <Card className="p-4 md:p-6 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl [&_.fc-theme-standard]:border-black/5 dark:[&_.fc-theme-standard]:border-white/5 [&_.fc-col-header-cell]:py-2 [&_.fc-col-header-cell]:font-medium [&_.fc-day-today]:!bg-blue-500/5 dark:[&_.fc-day-today]:!bg-blue-500/10">
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
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventChange={(arg) => {
              // Handle drag/drop or resize updates here
              console.log("Event changed", arg.event);
            }}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
          />
        </Card>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Schedule a new event. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="col-span-3"
                placeholder="Event title..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <textarea
                id="description"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                placeholder="Event details..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Department
              </Label>
              <select
                id="department"
                value={newEventDepartmentId}
                onChange={(e) => setNewEventDepartmentId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
              >
                <option value="">No Department (General)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrence" className="text-right">
                Recurrence
              </Label>
              <select
                id="recurrence"
                value={newEventRecurrence}
                onChange={(e) => setNewEventRecurrence(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <Input
                id="color"
                type="color"
                value={newEventColor}
                onChange={(e) => setNewEventColor(e.target.value)}
                className="col-span-3 h-10 px-1 py-1 cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Event
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
                <p className="text-foreground leading-relaxed">{selectedEvent.description}</p>
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
          </div>

          <DialogFooter className="gap-2">
            {isConfirmingDelete ? (
              <div className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="flex-1 text-sm text-destructive font-medium">Are you sure you want to delete this event?</p>
                <Button size="sm" variant="outline" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteEvent} className="gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </Button>
                <Button variant="outline" onClick={() => { setIsViewModalOpen(false); setIsConfirmingDelete(false); }}>
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
