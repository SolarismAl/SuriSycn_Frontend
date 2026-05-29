"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("low");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      if (res.data?.status === "success") {
        setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks");
      if (res.data?.status === "success") {
        const list = Array.isArray(res.data.data) ? res.data.data : (res.data.data.data || []);
        setTasks(list);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle) {
      toast.error("Title is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        due_date: newTaskDate || null,
        assigned_to: newTaskAssignedTo || null,
        status: "pending",
      };
      const res = await api.post("/tasks", payload);
      if (res.data?.status === "success") {
        setTasks([...tasks, res.data.data]);
        setIsModalOpen(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("low");
        setNewTaskDate("");
        setNewTaskAssignedTo("");
        toast.success("Task created successfully!");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = async (e: any, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (error) {
      toast.error("Failed to move task");
      fetchTasks();
    }
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  const todoTasks = tasks.filter((t) => t.status === "pending" || !t.status);
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const inReviewTasks = tasks.filter((t) => t.status === "in_review");
  const doneTasks = tasks.filter((t) => t.status === "completed");

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "medium": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "low": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-semibold tracking-tight"
          >
            Tasks Board
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-muted-foreground"
          >
            Manage department workflows and personal tasks.
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </motion.div>
      </div>

      {/* Kanban Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 mt-2 h-full min-h-[500px]">
        {/* TODO Column */}
        <div 
          className="flex flex-col gap-4 min-w-0 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "pending")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">To Do</span>
              <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-xs bg-black/10 dark:bg-white/10">{todoTasks.length}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)} className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {todoTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <TaskCard task={task} users={users} priorityColor={getPriorityColor(task.priority)} icon={<AlertCircle className="w-4 h-4 text-orange-500" />} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* IN PROGRESS Column */}
        <div 
          className="flex flex-col gap-4 min-w-0 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "in_progress")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400">In Progress</span>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-full px-2 py-0 h-5 text-xs">{inProgressTasks.length}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {inProgressTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.2 }}>
                <TaskCard task={task} users={users} priorityColor={getPriorityColor(task.priority)} icon={<Clock className="w-4 h-4 text-blue-500" />} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* IN REVIEW Column */}
        <div 
          className="flex flex-col gap-4 min-w-0 bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "in_review")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm uppercase tracking-wider text-purple-600 dark:text-purple-400">In Review</span>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded-full px-2 py-0 h-5 text-xs">{inReviewTasks.length}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {inReviewTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.3 }}>
                <TaskCard task={task} users={users} priorityColor={getPriorityColor(task.priority)} icon={<Clock className="w-4 h-4 text-purple-500" />} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* DONE Column */}
        <div 
          className="flex flex-col gap-4 min-w-0 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "completed")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Done</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-full px-2 py-0 h-5 text-xs">{doneTasks.length}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {doneTasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.4 }}>
                <TaskCard task={task} users={users} priorityColor={getPriorityColor(task.priority)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task and add it to your board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="col-span-3"
                placeholder="Task title..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="desc" className="text-right">Description</Label>
              <textarea
                id="desc"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                placeholder="Task description..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">Priority</Label>
              <select
                id="priority"
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="due_date" className="text-right">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigned_to" className="text-right">Assign To</Label>
              <select
                id="assigned_to"
                value={newTaskAssignedTo}
                onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? "Saving Task..." : "Save Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({ task, priorityColor, icon, users }: { task: any, priorityColor: string, icon: React.ReactNode, users: any[] }) {
  const getInitials = (userId: string) => {
    if (!userId) return "??";
    const user = users.find(u => u.id === userId);
    if (!user) return "??";
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  };
  
  const initials = getInitials(task.assigned_to || task.created_by);
  const fullName = users.find(u => u.id === (task.assigned_to || task.created_by))?.first_name || "Unknown";

  return (
    <Card 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
      }}
      className="p-4 border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-3xl shadow-sm rounded-2xl hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider border ${priorityColor}`}>
            {task.priority}
          </Badge>
          {task.task_number && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{task.task_number}</span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <h3 className="font-medium text-sm mb-1 leading-snug">{task.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{task.description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No Date"}</span>
        </div>
        <Avatar className="w-6 h-6 border-2 border-background shadow-sm" title={fullName}>
          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </Card>
  );
}
