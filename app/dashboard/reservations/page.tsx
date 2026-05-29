"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DoorOpen,
  Clock,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { useAuthStore } from "@/store/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
  id: string;
  room_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatetimeLocal(iso: string) {
  // Converts ISO to "YYYY-MM-DDTHH:mm" for datetime-local inputs
  return iso.slice(0, 16);
}

function formatDisplay(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map = {
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${map[status]}`}
    >
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-black/5 dark:bg-white/5 p-5 flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="h-5 w-40 bg-black/10 dark:bg-white/10 rounded-lg" />
        <div className="h-5 w-16 bg-black/10 dark:bg-white/10 rounded-full" />
      </div>
      <div className="h-4 w-56 bg-black/10 dark:bg-white/10 rounded" />
      <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded" />
    </div>
  );
}

// ─── Book / Edit Form Modal ───────────────────────────────────────────────────

interface ReservationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Reservation | null;
}

function ReservationFormModal({ open, onClose, onSaved, editing }: ReservationFormModalProps) {
  const isEdit = !!editing;

  const [roomName, setRoomName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate fields when editing
  useEffect(() => {
    if (editing) {
      setRoomName(editing.room_name);
      setStartTime(formatDatetimeLocal(editing.start_time));
      setEndTime(formatDatetimeLocal(editing.end_time));
    } else {
      setRoomName("");
      setStartTime("");
      setEndTime("");
    }
    setErrors({});
  }, [editing, open]);

  function validate() {
    const e: Record<string, string> = {};
    if (!roomName.trim()) e.room_name = "Room name is required";
    if (!startTime) e.start_time = "Start time is required";
    if (!endTime) e.end_time = "End time is required";
    if (startTime && endTime && endTime <= startTime)
      e.end_time = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        room_name: roomName.trim(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };

      if (isEdit && editing) {
        await api.put(`/reservations/${editing.id}`, payload);
        toast.success("Reservation updated successfully");
      } else {
        await api.post("/reservations", payload);
        toast.success("Reservation request submitted!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Reservation" : "Book a Room"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Room Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room_name">Room Name</Label>
            <Input
              id="room_name"
              placeholder="e.g. Executive Boardroom"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              aria-invalid={!!errors.room_name}
              className="h-9"
            />
            {errors.room_name && (
              <span className="text-xs text-destructive">{errors.room_name}</span>
            )}
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-invalid={!!errors.start_time}
              className="h-9"
            />
            {errors.start_time && (
              <span className="text-xs text-destructive">{errors.start_time}</span>
            )}
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-invalid={!!errors.end_time}
              className="h-9"
            />
            {errors.end_time && (
              <span className="text-xs text-destructive">{errors.end_time}</span>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? (isEdit ? "Saving..." : "Submitting...") : (isEdit ? "Save Changes" : "Submit Request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  open: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({ open, reservation, onClose, onDeleted }: DeleteConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!reservation) return;
    setSubmitting(true);
    try {
      await api.delete(`/reservations/${reservation.id}`);
      toast.success("Reservation cancelled");
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to cancel reservation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Reservation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Are you sure you want to cancel the reservation for{" "}
              <strong>{reservation?.room_name}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
            className="gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Cancelling..." : "Cancel Reservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reservation Card ─────────────────────────────────────────────────────────

interface ReservationCardProps {
  reservation: Reservation;
  index: number;
  onEdit: (r: Reservation) => void;
  onDelete: (r: Reservation) => void;
  onStatusUpdate?: (r: Reservation, status: "approved" | "rejected") => void;
  canApprove?: boolean;
}

function ReservationCard({ reservation, index, onEdit, onDelete, onStatusUpdate, canApprove }: ReservationCardProps) {
  const statusAccent = {
    approved: "bg-emerald-500/20",
    pending: "bg-amber-500/20",
    rejected: "bg-red-500/20",
  }[reservation.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card className="p-5 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden group">
        {/* accent blob */}
        <div
          className={`absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full -mr-8 -mt-8 opacity-50 group-hover:opacity-100 transition-opacity ${statusAccent}`}
        />

        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{reservation.room_name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booked {format(parseISO(reservation.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDisplay(reservation.start_time)}</span>
            <span className="text-muted-foreground/50">→</span>
            <span>{format(parseISO(reservation.end_time), "h:mm a")}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 z-10 pt-1 border-t border-black/5 dark:border-white/5">
          <Button
            id={`edit-reservation-${reservation.id}`}
            size="sm"
            variant="ghost"
            onClick={() => onEdit(reservation)}
            className="gap-1.5 text-xs h-7 px-3 rounded-lg hover:bg-blue-500/10 hover:text-blue-600"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
          <Button
            id={`delete-reservation-${reservation.id}`}
            size="sm"
            variant="ghost"
            onClick={() => onDelete(reservation)}
            className="gap-1.5 text-xs h-7 px-3 rounded-lg hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
            Cancel
          </Button>

          {/* Staff/Admin approval actions for pending reservations */}
          {canApprove && reservation.status === "pending" && onStatusUpdate && (
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStatusUpdate(reservation, "rejected")}
                className="gap-1 text-xs h-7 px-2.5 rounded-lg text-red-600 hover:bg-red-500/10"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStatusUpdate(reservation, "approved")}
                className="gap-1 text-xs h-7 px-2.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </Button>
            </div>
          )}

          {reservation.status === "approved" && !canApprove && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function ReservationsPage() {
  const { user } = useAuthStore();
  const canApprove = user?.role === "admin" || user?.role === "staff";

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const [bookOpen, setBookOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Reservation[] }>("/reservations");
      setReservations(res.data.data);
    } catch {
      setError("Failed to load reservations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleStatusUpdate = async (reservation: Reservation, status: "approved" | "rejected") => {
    try {
      await api.put(`/reservations/${reservation.id}`, { status });
      toast.success(`Reservation ${status}`);
      fetchReservations();
    } catch {
      toast.error(`Failed to ${status} reservation`);
    }
  };

  const filtered =
    filterStatus === "all"
      ? reservations
      : reservations.filter((r) => r.status === filterStatus);

  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    approved: reservations.filter((r) => r.status === "approved").length,
    rejected: reservations.filter((r) => r.status === "rejected").length,
  };

  const todaySchedule = reservations
    .filter((r) => r.status === "approved" && isToday(parseISO(r.start_time)))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-semibold tracking-tight"
          >
            Room Reservations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-muted-foreground"
          >
            Book and manage meeting spaces across the city offices.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <Button
            id="refresh-reservations"
            variant="ghost"
            size="sm"
            onClick={fetchReservations}
            disabled={isLoading}
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            id="book-room-btn"
            onClick={() => setBookOpen(true)}
            className="rounded-xl shadow-md bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Book Room
          </Button>
        </motion.div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error} —{" "}
          <button onClick={fetchReservations} className="underline underline-offset-2 font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            id={`filter-${tab.key}`}
            onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filterStatus === tab.key
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                filterStatus === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-black/10 dark:bg-white/10 text-muted-foreground"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservations Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {filterStatus === "all" ? "All Reservations" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Reservations`}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
            >
              <DoorOpen className="w-10 h-10 opacity-30" />
              <p className="text-sm">No reservations found</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookOpen(true)}
                className="gap-1.5 text-purple-600 hover:bg-purple-500/10 mt-1"
              >
                <Plus className="w-4 h-4" />
                Book your first room
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((r, i) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    index={i}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    onStatusUpdate={handleStatusUpdate}
                    canApprove={canApprove}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Today's Schedule Sidebar */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Today&apos;s Schedule</h2>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl p-5">
              {isLoading ? (
                <div className="flex flex-col gap-5">
                  {[1, 2].map((i) => (
                    <div key={i} className="pl-6 flex flex-col gap-1.5">
                      <div className="animate-pulse h-4 w-36 bg-black/10 dark:bg-white/10 rounded" />
                      <div className="animate-pulse h-3 w-24 bg-black/10 dark:bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              ) : todaySchedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Calendar className="w-7 h-7 opacity-30" />
                  <p className="text-sm">No approved reservations today</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {todaySchedule.map((res, i) => (
                    <div key={res.id} className="relative pl-6">
                      {i !== todaySchedule.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-[-24px] w-px bg-black/10 dark:bg-white/10" />
                      )}
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-emerald-500" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm">{res.room_name}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(res.start_time), "h:mm a")} –{" "}
                          {format(parseISO(res.end_time), "h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <ReservationFormModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onSaved={fetchReservations}
      />
      <ReservationFormModal
        open={!!editTarget}
        editing={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchReservations}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        reservation={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={fetchReservations}
      />
    </div>
  );
}
