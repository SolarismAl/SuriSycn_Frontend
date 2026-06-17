"use client";

import { motion } from "motion/react";
import { Search, Bell, Menu, LayoutDashboard, Calendar, FileText, CheckSquare, Settings, Users, Building, Loader2, Check, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/axios";
import { toast } from "sonner";

export function Topbar({ setSidebarOpen }: { setSidebarOpen?: (open: boolean) => void }) {
  const router = useRouter();
  
  // Search / Command State
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const res = await api.get("/notifications");
      if (res.data?.status === "success") {
        setNotifications(res.data.data.data || []);
      }
      const unreadRes = await api.get("/notifications/unread");
      if (unreadRes.data?.status === "success") {
        setUnreadCount(unreadRes.data.data.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 1 minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/70 dark:bg-black/40 backdrop-blur-3xl border-b border-black/5 dark:border-white/5"
      >
        <div className="relative w-full max-w-md flex items-center z-50">
          {setSidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden mr-2 shrink-0 h-8 w-8 rounded-full" 
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          <Command className="relative w-full rounded-2xl bg-black/5 dark:bg-white/10 border-none overflow-visible">
            <div className="flex items-center w-full px-3 outline-none focus-within:ring-2 focus-within:ring-blue-500/50 transition-all rounded-2xl relative z-20 bg-transparent">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <CommandPrimitive.Input 
                ref={inputRef}
                placeholder="Search everywhere..."
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                className="flex-1 px-3 h-10 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="hidden sm:flex text-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
                ⌘K
              </div>
            </div>

            {open && (
              <div className="absolute top-12 left-0 w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CommandList className="max-h-[300px] overflow-y-auto p-1">
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Navigation">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Overview Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/schedule"))}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Schedule & Calendar</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/tasks"))}>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span>Task Board</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/documents"))}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Document Center</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/reservations"))}>
                      <Building className="mr-2 h-4 w-4" />
                      <span>Room Reservations</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/cto"))}>
                      <Clock className="mr-2 h-4 w-4" />
                      <span>Manage CTO</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>System Settings</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </div>
            )}
          </Command>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger className="inline-flex items-center justify-center relative rounded-full w-10 h-10 hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors focus-visible:outline-none">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-black" />
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="text-sm font-semibold">Notifications</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleMarkAllAsRead}>
                    <Check className="w-3 h-3 mr-1" /> Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="h-80">
                {isLoadingNotifications && notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="flex flex-col">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read_at ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        onClick={() => {
                          if (!notification.read_at) handleMarkAsRead(notification.id);
                          // Optionally navigate based on notification type here
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-none">{notification.data?.title || 'Notification'}</span>
                          {!notification.read_at && <span className="w-2 h-2 mt-0.5 rounded-full bg-blue-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.data?.message || 'You have a new update.'}</p>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </motion.header>
    </>
  );
}
