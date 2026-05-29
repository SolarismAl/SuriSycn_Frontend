"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect 'user' role away from admin-only dashboard root
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  useEffect(() => {
    if (mounted && isAuthenticated && (user?.role === "user" || user?.role === "staff") && pathname === "/dashboard") {
      router.replace("/dashboard/schedule");
    }
  }, [mounted, isAuthenticated, user, pathname, router]);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-background">
      {/* Background ambient gradient similar to VisionOS / iOS 26.5 */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} />
      
      <main className="flex-1 flex flex-col md:pl-64 h-screen overflow-hidden relative z-10 w-full transition-all duration-300">
        <Topbar setSidebarOpen={setSidebarOpen} />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth pb-24">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
