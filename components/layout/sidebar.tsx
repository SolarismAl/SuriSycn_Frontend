"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  CheckSquare,
  Users,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/axios";

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[]; // if undefined, visible to all authenticated users
};

const allNavItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "manager"],
  },
  {
    icon: Calendar,
    label: "Schedule",
    href: "/dashboard/schedule",
    // visible to everyone
  },
  {
    icon: DoorOpen,
    label: "Reservations",
    href: "/dashboard/reservations",
    // visible to everyone
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    href: "/dashboard/tasks",
    // visible to everyone
  },
  {
    icon: Users,
    label: "Directory",
    href: "/dashboard/directory",
    roles: ["admin", "manager"],
  },
  // {
  //   icon: FileText,
  //   label: "Documents",
  //   href: "/dashboard/documents",
  //   roles: ["admin", "manager"],
  // },
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["admin", "staff", "manager"],
  },
];

export function Sidebar({ isOpen = false }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role || "user";

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "US";

  // Filter nav items based on current user role
  const navItems = allNavItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <motion.aside
      className={cn(
        "flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-white/70 dark:bg-black/40 backdrop-blur-3xl border-r border-black/5 dark:border-white/5 z-50 p-4 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <Image src="/images/surigao-logo.png" alt="Surigao City Logo" width={32} height={32} className="object-contain" />
        </div>
        <span className="font-semibold text-lg tracking-tight">SuriSync</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-black/5 dark:bg-white/10 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-blue-500" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="mt-auto p-4 rounded-2xl bg-gradient-to-b from-black/5 to-black/0 dark:from-white/5 dark:to-white/0 border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0 flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 font-medium">{initials}</span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate">
              {user ? `${user.first_name} ${user.last_name}` : "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate capitalize">
              {role === "user" ? "Regular User" : role}
            </span>
          </div>
          <button
            onClick={async () => {
              try {
                await api.post("/logout");
              } catch {
                // Ignore API errors on logout
              }
              useAuthStore.getState().logout();
              window.location.href = "/login";
            }}
            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
