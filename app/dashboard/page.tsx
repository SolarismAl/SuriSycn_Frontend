"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import {
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Plus, Edit2, Trash2 } from "lucide-react";

// --- Skeleton helpers ---
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-black/10 dark:bg-white/10 ${className ?? ""}`}
    />
  );
}

function StatCardSkeleton() {
  return (
    <Card className="relative overflow-hidden p-5 flex flex-col gap-4 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
        <SkeletonBlock className="w-20 h-6 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="w-24 h-8" />
        <SkeletonBlock className="w-32 h-4" />
      </div>
    </Card>
  );
}

// --- Helpers ---
function formatRelativeDate(dateStr: string | null) {
  if (!dateStr) return "–";
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), "h:mm a");
}

function formatDistanceShort(dateStr: string) {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "high":
    case "urgent":
      return "bg-red-500";
    case "medium":
    case "normal":
      return "bg-blue-500";
    default:
      return "bg-gray-400";
  }
}

// Derive announcement "priority" from published_at proximity
function getAnnouncementPriority(publishedAt: string | null) {
  if (!publishedAt) return "Normal";
  const date = parseISO(publishedAt);
  if (isToday(date)) return "High";
  if (isYesterday(date)) return "Normal";
  return "Low";
}

// --- Main Component ---
export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { user } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<number | string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetAnnouncementForm = () => {
    setEditingAnnouncementId(null);
    setNewTitle("");
    setNewContent("");
  };

  const handleOpenNewAnnouncement = () => {
    resetAnnouncementForm();
    setIsModalOpen(true);
  };

  const handleEditAnnouncement = (ann: any) => {
    setEditingAnnouncementId(ann.id);
    setNewTitle(ann.title);
    setNewContent(ann.content || "");
    setIsModalOpen(true);
  };

  const handleDeleteAnnouncementClick = (id: number | string) => {
    setDeletingAnnouncementId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnouncementId) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/announcements/${deletingAnnouncementId}`);
      toast.success("Announcement deleted!");
      setIsDeleteDialogOpen(false);
      setDeletingAnnouncementId(null);
      refetch();
    } catch (err) {
      toast.error("Failed to delete announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingAnnouncementId) {
        await api.put(`/announcements/${editingAnnouncementId}`, {
          title: newTitle,
          content: newContent,
        });
        toast.success("Announcement updated!");
      } else {
        await api.post("/announcements", {
          title: newTitle,
          content: newContent,
          published_at: new Date().toISOString()
        });
        toast.success("Announcement posted!");
      }
      setIsModalOpen(false);
      resetAnnouncementForm();
      refetch();
    } catch (err) {
      toast.error(editingAnnouncementId ? "Failed to update announcement" : "Failed to post announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    {
      label: "Total Employees",
      value: isLoading ? null : (data?.stats.total_employees.toLocaleString() ?? "–"),
      trend: "+12%",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending Approvals",
      value: isLoading ? null : (data?.stats.pending_approvals.toString() ?? "–"),
      trend: "Needs Action",
      icon: CheckCircle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Tasks Progress",
      value: isLoading ? null : `${data?.stats.tasks_progress ?? 0}%`,
      trend: "On Track",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Room Reservations",
      value: isLoading ? null : (data?.stats.today_reservations.toString() ?? "–"),
      trend: "Today",
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-semibold tracking-tight"
          >
            Overview
          </motion.h1>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-muted-foreground"
        >
          Welcome back to SuriSync. Here&apos;s what&apos;s happening today.
        </motion.p>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error} —{" "}
          <button onClick={refetch} className="underline underline-offset-2 font-medium">
            Try again
          </button>
        </motion.div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1, type: "spring", bounce: 0.4 }}
              >
                <Card className="relative overflow-hidden p-5 flex flex-col gap-4 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md">
                      {stat.trend}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-3xl font-semibold tracking-tight">{stat.value}</span>
                    <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column: Schedule + Approvals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 flex flex-col gap-6"
        >
          {/* Today's Schedule */}
          <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg tracking-tight">Today&apos;s Schedule</h3>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                View Calendar
              </Badge>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                [1, 2].map((i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl border border-black/5 dark:border-white/5">
                    <SkeletonBlock className="min-w-[80px] h-12 rounded-lg" />
                    <div className="flex flex-col gap-2 flex-1">
                      <SkeletonBlock className="h-4 w-3/4" />
                      <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : data?.today_schedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <Calendar className="w-8 h-8 opacity-40" />
                  <span className="text-sm">No reservations scheduled for today</span>
                </div>
              ) : (
                data?.today_schedule.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-black/10 dark:border-white/10 pr-4">
                      <span className="text-xs font-bold text-blue-500">
                        {formatTime(item.start_time)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {formatTime(item.end_time)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-sm">{item.room_name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.start_time)} – {formatTime(item.end_time)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Pending Approvals */}
          <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg tracking-tight">Pending Approvals</h3>
              {!isLoading && data && data.pending_approvals.length > 0 && (
                <Badge className="bg-orange-500/10 text-orange-600 border-0">
                  {data.pending_approvals.length} pending
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg font-medium">Room</th>
                    <th className="px-4 py-3 font-medium">Requested</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 rounded-tr-lg rounded-br-lg font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-black/5 dark:border-white/5">
                        <td className="px-4 py-3"><SkeletonBlock className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><SkeletonBlock className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><SkeletonBlock className="h-4 w-16" /></td>
                        <td className="px-4 py-3 text-right"><SkeletonBlock className="h-6 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : data?.pending_approvals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No pending approvals 🎉
                      </td>
                    </tr>
                  ) : (
                    data?.pending_approvals.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{app.room_name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatTime(app.start_time)} – {formatTime(app.end_time)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatRelativeDate(app.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-blue-500 hover:text-white transition-colors border-blue-500/30 text-blue-600"
                          >
                            Review
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Right Column: Announcements + Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-1 flex flex-col gap-6"
        >
          {/* Announcements */}
          <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg tracking-tight">Announcements</h3>
              {user?.role === "admin" && (
                <Button variant="ghost" size="icon" onClick={handleOpenNewAnnouncement} className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-5">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <SkeletonBlock className="w-2 h-2 mt-1.5 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <SkeletonBlock className="h-4 w-full" />
                      <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : data?.announcements.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No announcements yet
                </div>
              ) : (
                data?.announcements.map((item) => {
                  const priority = getAnnouncementPriority(item.published_at);
                  return (
                    <div key={item.id} className="flex gap-4 items-start group">
                      <div
                        className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${getPriorityColor(priority)}`}
                      />
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-sm font-medium leading-tight">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(item.published_at ?? item.created_at)}
                        </span>
                      </div>
                      {user?.role === "admin" && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleEditAnnouncement(item)}
                            className="p-1 text-muted-foreground hover:text-blue-500 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncementClick(item.id)}
                            className="p-1 text-muted-foreground hover:text-red-500 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Recent Tasks */}
          <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl p-6">
            <h3 className="font-semibold text-lg tracking-tight mb-5">Recent Tasks</h3>
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <SkeletonBlock className="h-4 w-3/4" />
                      <SkeletonBlock className="h-3 w-1/3" />
                    </div>
                  </div>
                ))
              ) : data?.recent_tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No tasks yet
                </div>
              ) : (
                data?.recent_tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceShort(task.created_at)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            task.priority === "high" || task.priority === "urgent"
                              ? "bg-red-500/10 text-red-600"
                              : task.priority === "medium"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    {/* Progress mini bar */}
                    <div className="w-12 flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                      <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) resetAnnouncementForm(); setIsModalOpen(open); }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncementId ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Office closed tomorrow"
                className="col-span-3 bg-white/50 dark:bg-black/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Details of the announcement..."
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-white/50 dark:bg-black/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetAnnouncementForm(); }} disabled={isSubmitting} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveAnnouncement} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {isSubmitting ? (editingAnnouncementId ? "Updating..." : "Posting...") : (editingAnnouncementId ? "Update Announcement" : "Post Announcement")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete this announcement? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
