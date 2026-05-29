"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Shield,
  Bell,
  Palette,
  Lock,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { RoleManagementPanel } from "@/components/role-management";
import { DepartmentsManagementPanel } from "@/components/departments-management";

// ─── Settings Tabs ────────────────────────────────────────────────────────────

type SettingsTab = "profile" | "security" | "notifications" | "appearance" | "departments" | "roles";

interface TabDef {
  key: SettingsTab;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  staffOrAdmin?: boolean;
}

const tabs: TabDef[] = [
  { key: "profile",       label: "Profile",       icon: User },
  { key: "security",      label: "Security",      icon: Lock },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance",    label: "Appearance",    icon: Palette },
  { key: "departments",   label: "Departments",   icon: Briefcase, staffOrAdmin: true },
  { key: "roles",         label: "Role Management", icon: Shield, adminOnly: true },
];

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Profile update endpoint — extend backend if needed
      await api.patch("/me", { first_name: firstName, last_name: lastName });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
        <h3 className="font-semibold text-base mb-5">Personal Information</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {initials || "U"}
          </div>
          <div>
            <p className="font-medium">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="inline-flex mt-1 items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 capitalize">
              {user?.role === "user" ? "Regular User" : user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-first-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                First Name
              </Label>
              <Input
                id="settings-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-last-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Last Name
              </Label>
              <Input
                id="settings-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </Label>
            <Input
              value={user?.email ?? ""}
              disabled
              className="rounded-xl h-10 opacity-60"
            />
            <p className="text-xs text-muted-foreground ml-1">Email cannot be changed. Contact an admin.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              id="save-profile"
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error("New passwords do not match"); return; }
    if (next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await api.patch("/me/password", {
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      toast.success("Password updated successfully");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update password";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function PasswordInput({
    id, label, value, onChange, show, onToggle,
  }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; show: boolean; onToggle: () => void;
  }) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-xl h-10 pr-10"
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
      <h3 className="font-semibold text-base mb-5">Change Password</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <PasswordInput
          id="current-password"
          label="Current Password"
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
        />
        <PasswordInput
          id="new-password"
          label="New Password"
          value={next}
          onChange={setNext}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
        />
        <div className="flex justify-end pt-2">
          <Button
            id="save-password"
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function Toggle({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-blue-600" : "bg-black/20 dark:bg-white/20"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    reservation_updates: true,
    task_assignments: true,
    announcements: true,
    system_alerts: false,
  });

  const items = [
    { key: "reservation_updates" as const, label: "Reservation Updates", desc: "When your reservation is approved or rejected" },
    { key: "task_assignments" as const, label: "Task Assignments", desc: "When a task is assigned to you" },
    { key: "announcements" as const, label: "Announcements", desc: "New announcements from management" },
    { key: "system_alerts" as const, label: "System Alerts", desc: "Maintenance windows and system notifications" },
  ];

  return (
    <Card className="p-6 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
      <h3 className="font-semibold text-base mb-5">Notification Preferences</h3>
      <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Toggle
              id={`notif-${item.key}`}
              checked={prefs[item.key]}
              onChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
        <h3 className="font-semibold text-base mb-5">Theme</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use the <span className="font-medium text-foreground">theme toggle button</span> (bottom-right corner) to switch between light and dark mode.
        </p>
        <div className="flex gap-3">
          {["light", "dark", "system"].map((t) => (
            <div
              key={t}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-default ${
                t === "system" ? "border-blue-500 bg-blue-500/5" : "border-black/10 dark:border-white/10"
              }`}
            >
              <div className={`w-10 h-7 rounded-lg ${
                t === "light" ? "bg-white border border-black/10" :
                t === "dark" ? "bg-neutral-900 border border-white/10" :
                "bg-gradient-to-r from-white to-neutral-900 border border-black/10"
              }`} />
              <span className="text-xs font-medium capitalize">{t}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
        <h3 className="font-semibold text-base mb-1">Layout Density</h3>
        <p className="text-xs text-muted-foreground mb-4">Controls spacing throughout the interface</p>
        <div className="flex gap-3">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              id={`density-${d}`}
              onClick={() => setDensity(d)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
                density === d
                  ? "border-blue-500 bg-blue-500/10 text-blue-600"
                  : "border-black/10 dark:border-white/10 text-muted-foreground hover:border-black/20 dark:hover:border-white/20"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const visibleTabs = tabs.filter((t) => {
    if (t.adminOnly) return isAdmin;
    if (t.staffOrAdmin) return isAdmin || isStaff;
    return true;
  });

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    profile:       <ProfileTab />,
    security:      <SecurityTab />,
    notifications: <NotificationsTab />,
    appearance:    <AppearanceTab />,
    departments:   <DepartmentsManagementPanel />,
    roles:         <RoleManagementPanel />,
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full pb-10">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-semibold tracking-tight"
        >
          Settings
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-muted-foreground"
        >
          Manage your account, preferences, and system configuration.
        </motion.p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <motion.nav
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:w-56 shrink-0"
        >
          <Card className="p-2 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm">
            <div className="flex flex-col gap-0.5">
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    id={`settings-tab-${t.key}`}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full ${
                      isActive
                        ? "bg-black/5 dark:bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-500" : ""}`} />
                    <span className="flex-1">{t.label}</span>
                    {t.adminOnly && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        ADMIN
                      </span>
                    )}
                    {t.staffOrAdmin && !t.adminOnly && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        STAFF
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? "opacity-100 text-muted-foreground" : "opacity-0"}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
