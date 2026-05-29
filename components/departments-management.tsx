"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export function DepartmentsManagementPanel() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Department[] }>("/departments");
      setDepartments(res.data.data);
    } catch {
      setError("Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/departments", { name, description });
      toast.success("Department added successfully");
      setAddOpen(false);
      setName("");
      setDescription("");
      fetchDepartments();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add department";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Departments</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDepartments}
              disabled={loading}
              className="rounded-xl gap-1.5 h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto p-4">
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No departments found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {departments.map((dept) => (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 flex flex-col gap-1"
                  >
                    <h4 className="font-semibold text-sm">{dept.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {dept.description || "No description"}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Name
              </Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IT Department"
                className="rounded-xl h-10"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <Input
                id="dept-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="rounded-xl h-10"
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
