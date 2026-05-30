"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

interface Reservation {
  id: string;
  room_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
}

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  reservations: Reservation[];
}

export default function CalendarModal({ open, onClose, reservations }: CalendarModalProps) {
  const events = reservations.map((r) => ({
    id: r.id,
    title: `${r.room_name} (${r.status})`,
    start: r.start_time,
    end: r.end_time,
    backgroundColor: r.status === "approved" ? "#10b981" : r.status === "pending" ? "#f59e0b" : "#ef4444",
    borderColor: "transparent",
  }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Room Reservations Calendar</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 mt-4 overflow-auto">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
