"use client";

import { motion } from "motion/react";
import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar({ setSidebarOpen }: { setSidebarOpen?: (open: boolean) => void }) {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/70 dark:bg-black/40 backdrop-blur-3xl border-b border-black/5 dark:border-white/5"
    >
      <div className="flex items-center w-full max-w-md bg-black/5 dark:bg-white/10 rounded-2xl px-3 outline-none focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
        {setSidebarOpen && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2 shrink-0 h-8 w-8 rounded-full" 
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input 
          type="text" 
          placeholder="Search everywhere..."  
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-3 h-10 text-sm"
        />
        <div className="hidden sm:flex text-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
          ⌘K
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5 dark:hover:bg-white/10">
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </motion.header>
  );
}
