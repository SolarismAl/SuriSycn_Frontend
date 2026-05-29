"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Mail, Users, Shield, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function DirectoryPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Security check: Only Admin and Manager can view Directory
  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, isAuthenticated, router]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("/users");
        if (res.data?.status === "success") {
          setUsersList(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (err) {
        setError("Failed to load directory");
      } finally {
        setLoading(false);
      }
    }
    if (user?.role === "admin" || user?.role === "manager") {
      fetchUsers();
    }
  }, [user]);

  const filteredUsers = usersList.filter((u) => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const s = search.toLowerCase();
    return fullName.includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
  });

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return null;
  }

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
            Directory
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-muted-foreground"
          >
            Find colleagues and manage organizational roles.
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="p-4 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 rounded-xl h-10"
            />
          </div>
        </Card>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredUsers.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <Card className="p-5 border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-3xl shadow-sm rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-tight">{u.first_name} {u.last_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="capitalize">{u.role === 'user' ? 'Regular User' : u.role}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <Users className="w-8 h-8 opacity-20" />
                <p>No users found matching your search.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
