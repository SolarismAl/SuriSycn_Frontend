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
        <div className="flex-1 min-h-0 mt-4 overflow-auto [&_.fc-theme-standard]:border-black/5 dark:[&_.fc-theme-standard]:border-white/5 dark:[&_th.fc-col-header-cell]:!bg-transparent dark:[&_.fc-theme-standard_th]:!bg-transparent dark:[&_.fc-col-header-cell-cushion]:!text-zinc-100 dark:[&_.fc-daygrid-day-number]:!text-zinc-100 dark:[&_.fc-toolbar-title]:!text-zinc-100 dark:[&_th]:!border-white/5 [&_td.fc-day]:!bg-white/90 dark:[&_td.fc-day]:!bg-white/10 [&_td.fc-day-other]:!bg-black/5 dark:[&_td.fc-day-other]:!bg-transparent [&_.fc-daygrid-day-top]:flex [&_.fc-daygrid-day-top]:justify-end [&_.fc-daygrid-day-top]:p-1 [&_.fc-daygrid-day-events]:p-1 [&_td.fc-day-today]:!bg-blue-500/20 dark:[&_td.fc-day-today]:!bg-blue-500/30 [&_.fc-event]:!border-dashed [&_.fc-event]:!border-2 [&_.fc-event-main]:p-1 [&_.fc-event-main-frame]:!items-start [&_.fc-event-time]:!mr-1 [&_.fc-event-title]:!whitespace-normal [&_.fc-event-title]:!break-words [&_.fc-event-title]:!font-normal">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
