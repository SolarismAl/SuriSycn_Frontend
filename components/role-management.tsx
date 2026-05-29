"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  User,
  Crown,
  Briefcase,
  UserCog,
} from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "admin" | "staff" | "manager" | "user";

interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  department_id: string | null;
  created_at: string;
}

// ─── Role Config ──────────────────────────────────────────────────────────────

const roleConfig: Record<
  Role,
  { label: string; icon: React.ElementType; color: string; bg: string; description: string }
> = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-500/20",
    description: "Full system access",
  },
  staff: {
    label: "Staff",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-500/10 border-blue-500/20",
    description: "Standard employee access",
  },
  manager: {
    label: "Manager",
    icon: UserCog,
    color: "text-purple-600",
    bg: "bg-purple-500/10 border-purple-500/20",
    description: "Department management access",
  },
  user: {
    label: "User",
    icon: User,
    color: "text-gray-600",
    bg: "bg-gray-500/10 border-gray-500/20",
    description: "Limited access (schedule, reservations, tasks)",
  },
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const cfg = roleConfig[role] ?? roleConfig.user;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Role Dropdown ────────────────────────────────────────────────────────────

function RoleDropdown({
  userId,
  currentRole,
  disabled,
  onRoleChanged,
}: {
  userId: string;
  currentRole: Role;
  disabled: boolean;
  onRoleChanged: (userId: string, newRole: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSelect(role: Role) {
    if (role === currentRole) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      onRoleChanged(userId, role);
      toast.success(`Role updated to ${roleConfig[role].label}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update role";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        id={`role-btn-${userId}`}
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-2"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RoleBadge role={currentRole} />
        )}
        {!loading && <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 z-20 min-w-[220px] bg-popover border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                {(Object.keys(roleConfig) as Role[]).map((r) => {
                  const cfg = roleConfig[r];
                  const Icon = cfg.icon;
                  const isActive = r === currentRole;
                  return (
                    <button
                      key={r}
                      id={`role-option-${userId}-${r}`}
                      onClick={() => handleSelect(r)}
                      className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isActive
                          ? "bg-black/5 dark:bg-white/10"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded-lg ${cfg.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          {cfg.label}
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{cfg.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function UserRowSkeleton() {
  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="animate-pulse h-4 bg-black/10 dark:bg-white/10 rounded-lg w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Role Management Panel ────────────────────────────────────────────────────

export function RoleManagementPanel() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: UserRecord[] }>("/users");
      setUsers(res.data.data);
    } catch {
      setError("Failed to load users. Make sure you have admin access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleRoleChanged(userId: string, newRole: Role) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(roleConfig) as Role[]).map((r) => {
          const cfg = roleConfig[r];
          const Icon = cfg.icon;
          return (
            <Card
              key={r}
              className="flex items-center gap-3 p-4 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm"
            >
              <div className={`p-2 rounded-xl border ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div>
                <p className="text-xl font-semibold tabular-nums">{roleCounts[r] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Table card */}
      <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 flex-1 max-w-xs bg-black/5 dark:bg-white/5 rounded-xl px-3">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              id="user-search"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 px-0 text-sm"
            />
          </div>
          <Button
            id="refresh-users"
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <span className="text-xs text-muted-foreground">{users.length} users</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-black/3 dark:bg-white/3 border-b border-black/5 dark:border-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <UserRowSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-foreground/60">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {u.first_name} {u.last_name}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {format(parseISO(u.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <RoleDropdown
                          userId={u.id}
                          currentRole={u.role as Role}
                          disabled={isSelf}
                          onRoleChanged={handleRoleChanged}
                        />
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
