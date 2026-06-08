"use client";

import { useState, useEffect } from "react";
import { format, parseISO, addDays, isAfter, differenceInMinutes, parse, isWeekend, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths } from "date-fns";
import { PlusCircle, Clock, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth-store";
import { useCtoStore } from "@/store/cto-store";
import { api } from "@/lib/axios";
import { toast } from "sonner";

type CtoEntry = {
  id: string;
  user_id: string;
  type: "earned" | "used";
  date: string;
  hours: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
};

type CtoBalance = {
  total_earned: string;
  total_used: string;
  available_balance: string;
  pending_earned: string;
  pending_used: string;
};

export default function CTOPage() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const { cache, loading, fetchData } = useCtoStore();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  const currentData = cache[selectedUserId];
  const entries = currentData?.entries || [];
  const balance = currentData?.balance || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"earned" | "used">("earned");
  
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    startTime: "",
    endTime: "",
    hours: "",
    reason: "",
    isHoliday: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin approval modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CtoEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (isAdminOrManager) {
      api.get("/users").then(res => setUsers(res.data.data)).catch(console.error);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    fetchData(selectedUserId);
  }, [selectedUserId, fetchData]);

  // Auto-calculate hours if start/end time is provided
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = parse(formData.startTime, 'HH:mm', new Date());
      const end = parse(formData.endTime, 'HH:mm', new Date());
      if (end > start) {
        const diff = differenceInMinutes(end, start) / 60;
        setFormData(prev => ({ ...prev, hours: diff.toFixed(2) }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'earned' && (!formData.hours || isNaN(Number(formData.hours)) || Number(formData.hours) <= 0)) {
      toast.error("Please enter a valid number of hours");
      return;
    }
    if (!formData.reason) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      setIsSubmitting(true);

      const datesToSubmit = [];
      let curr = parseISO(formData.date);
      const end = formData.endDate ? parseISO(formData.endDate) : curr;

      if (isAfter(curr, end)) {
        toast.error("End date must be at or after start date");
        setIsSubmitting(false);
        return;
      }

      while (!isAfter(curr, end)) {
        datesToSubmit.push(format(curr, "yyyy-MM-dd"));
        curr = addDays(curr, 1);
      }

      for (const d of datesToSubmit) {
        let submittedHours = modalType === 'used' ? "8" : formData.hours;
        if (modalType === 'earned') {
           const dayIsWeekend = isWeekend(parseISO(d));
           if (dayIsWeekend || formData.isHoliday) {
              submittedHours = String(Number(formData.hours) * 1.5);
           }
        }
        
        await api.post("/cto", {
          type: modalType,
          date: d,
          hours: submittedHours,
          reason: formData.reason,
        });
      }

      toast.success(datesToSubmit.length > 1 ? `Successfully submitted ${datesToSubmit.length} requests` : "Request submitted successfully");
      setIsModalOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), endDate: "", startTime: "", endTime: "", hours: "", reason: "", isHoliday: false });
      fetchData(selectedUserId, true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedEntry) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/cto/${selectedEntry.id}/status`, {
        status,
        notes: reviewNotes,
      });
      toast.success(`Request ${status} successfully`);
      setIsReviewModalOpen(false);
      fetchData(selectedUserId, true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkReview = async (status: "approved" | "rejected") => {
    if (selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/cto/bulk-status`, {
        ids: selectedIds,
        status,
        notes: reviewNotes,
      });
      toast.success(`${selectedIds.length} requests ${status} successfully`);
      setIsBulkReviewModalOpen(false);
      setSelectedIds([]);
      fetchData(selectedUserId, true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to bulk update requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none">Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "earned" 
      ? <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Log Overtime</Badge>
      : <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Time Off</Badge>;
  };

  if (loading && !currentData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="h-9 w-48 bg-muted animate-pulse rounded-md mb-2"></div>
            <div className="h-5 w-64 bg-muted animate-pulse rounded-md"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded-md"></div>
            <div className="h-10 w-36 bg-muted animate-pulse rounded-md"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted animate-pulse rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted animate-pulse rounded"></div></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><div className="h-6 w-40 bg-muted animate-pulse rounded"></div></CardHeader>
          <CardContent><div className="h-64 w-full bg-muted animate-pulse rounded"></div></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Off (CTO)</h1>
          <p className="text-muted-foreground mt-1">Manage your compensatory time off and overtime logs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            className="bg-white"
            onClick={() => setIsCalendarModalOpen(true)}
          >
            <Calendar className="w-4 h-4 mr-2 text-slate-600" />
            View Calendar
          </Button>
          <Button 
            onClick={() => { setModalType("earned"); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Log Overtime
          </Button>
          <Button 
            variant="outline"
            onClick={() => { setModalType("used"); setIsModalOpen(true); }}
          >
            <Clock className="w-4 h-4 mr-2" />
            Request Time Off
          </Button>
        </div>
      </div>

      {isAdminOrManager && (
        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
          <Label className="whitespace-nowrap font-medium">Dashboard View:</Label>
          <select 
            className="flex h-9 w-full max-w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="all">Company Overview (All Users)</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
            ))}
          </select>
        </div>
      )}

      {/* Balance Cards / Company Overview */}
      {selectedUserId === "all" && Array.isArray(balance) ? (
        <Card>
          <CardHeader>
            <CardTitle>Company CTO Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {balance.map(b => (
                <div key={b.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border">
                  <span className="font-medium truncate">{b.name}</span>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 whitespace-nowrap">{b.available_balance} hrs</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{!Array.isArray(balance) ? balance?.available_balance || "0" : "0"} <span className="text-sm font-normal text-muted-foreground">hrs</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <PlusCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{!Array.isArray(balance) ? balance?.total_earned || "0" : "0"} <span className="text-sm font-normal text-muted-foreground">hrs</span></div>
              {!Array.isArray(balance) && Number(balance?.pending_earned) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">+{balance?.pending_earned} pending</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Used</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{!Array.isArray(balance) ? balance?.total_used || "0" : "0"} <span className="text-sm font-normal text-muted-foreground">hrs</span></div>
              {!Array.isArray(balance) && Number(balance?.pending_used) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">+{balance?.pending_used} pending</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.filter(e => e.status === 'pending').length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>History & Requests</CardTitle>
          {isAdminOrManager && selectedIds.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => { setReviewNotes(""); setIsBulkReviewModalOpen(true); }}>
                Bulk Approve ({selectedIds.length})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No CTO logs or requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    {isAdminOrManager && (
                      <th className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={entries.filter(e => e.status === 'pending').length > 0 && selectedIds.length === entries.filter(e => e.status === 'pending').length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(entries.filter(e => e.status === 'pending').map(e => e.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium">Date</th>
                    {isAdminOrManager && <th className="px-4 py-3 font-medium">Employee</th>}
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {isAdminOrManager && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30">
                      {isAdminOrManager && (
                        <td className="px-4 py-3">
                          {entry.status === 'pending' && (
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedIds.includes(entry.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, entry.id]);
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== entry.id));
                                }
                              }}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">{format(new Date(entry.date), "MMM d, yyyy")}</td>
                      {isAdminOrManager && (
                        <td className="px-4 py-3 font-medium">{entry.user?.first_name} {entry.user?.last_name}</td>
                      )}
                      <td className="px-4 py-3">{getTypeBadge(entry.type)}</td>
                      <td className="px-4 py-3 font-medium">{entry.hours}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={entry.reason}>{entry.reason}</td>
                      <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                      {isAdminOrManager && (
                        <td className="px-4 py-3 text-right">
                          {entry.status === 'pending' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setReviewNotes("");
                                setIsReviewModalOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Reviewed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalType === 'earned' ? 'Log Overtime (Earn CTO)' : 'Request Time Off (Use CTO)'}</DialogTitle>
            <DialogDescription>
              {modalType === 'earned' 
                ? 'Submit your rendered overtime hours to be converted into CTO credits.'
                : 'Request to use your available CTO balance for time off.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  required 
                  max={modalType === 'earned' ? format(new Date(), "yyyy-MM-dd") : undefined}
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date (Optional mass add)</Label>
                <Input 
                  type="date" 
                  max={modalType === 'earned' ? format(new Date(), "yyyy-MM-dd") : undefined}
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            {modalType === 'earned' && (
              <label className="flex items-start gap-3 cursor-pointer group p-3 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors mt-2">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                  checked={formData.isHoliday}
                  onChange={(e) => setFormData({...formData, isHoliday: e.target.checked})}
                />
                <div className="text-sm">
                  <span className="font-medium block group-hover:text-blue-700 transition-colors">Weekday Holiday</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">Check this if the overtime falls on a weekday holiday. Weekends are automatically detected. Multiplier: 1.5x</span>
                </div>
              </label>
            )}

            {modalType === 'earned' && (() => {
              const isWeekendDay = formData.date ? isWeekend(parseISO(formData.date)) : false;
              const isSpecialDay = isWeekendDay || formData.isHoliday;
              
              // Calculate totals
              let totalWorkHours = 0;
              let totalCtoHours = 0;
              let daysCount = 0;

              if (formData.hours && !isNaN(Number(formData.hours)) && formData.date) {
                try {
                  const start = parseISO(formData.date);
                  const end = formData.endDate ? parseISO(formData.endDate) : start;
                  const limit = isAfter(start, end) ? start : end;
                  let curr = start;
                  
                  // Cap to max 31 days to prevent infinite loops in case of weird dates
                  while (curr <= limit && daysCount < 31) {
                    daysCount++;
                    const isDaySpecial = isWeekend(curr) || formData.isHoliday;
                    const dailyHours = Number(formData.hours);
                    totalWorkHours += dailyHours;
                    totalCtoHours += isDaySpecial ? dailyHours * 1.5 : dailyHours;
                    curr = addDays(curr, 1);
                  }
                } catch (e) {
                  // Fallback in case of parsing errors while typing
                }
              }
              
              return (
                <div className="space-y-4">
                  {!isSpecialDay && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Start Time <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                          <Input 
                            type="time" 
                            value={formData.startTime}
                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>End Time <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
                          <Input 
                            type="time" 
                            value={formData.endTime}
                            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-muted/30 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          onClick={() => setFormData({...formData, startTime: "18:00", endTime: "20:00"})}
                        >
                          6 PM - 8 PM
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-muted/30 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          onClick={() => setFormData({...formData, startTime: "18:00", endTime: "21:00"})}
                        >
                          6 PM - 9 PM
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-muted/30 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          onClick={() => setFormData({...formData, startTime: "18:00", endTime: "22:00"})}
                        >
                          <Clock className="w-3 h-3 mr-1.5 text-blue-500" />
                          6 PM - 10 PM
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 border p-4 rounded-md bg-muted/10">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Hours (Per day)</Label>
                        {isSpecialDay && (
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className={`h-7 text-xs transition-colors ${formData.hours === "4" ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" : ""}`}
                              onClick={() => setFormData({...formData, hours: "4", startTime: "", endTime: ""})}
                            >
                              Half Day
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className={`h-7 text-xs transition-colors ${formData.hours === "8" ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" : ""}`}
                              onClick={() => setFormData({...formData, hours: "8", startTime: "", endTime: ""})}
                            >
                              Whole Day
                            </Button>
                          </div>
                        )}
                      </div>
                      <Input 
                        type="number" 
                        step="0.5"
                        min="0.5"
                        required 
                        placeholder={isSpecialDay ? "e.g. 4 or 8 or use quick buttons above" : "e.g. 4.5"}
                        value={formData.hours}
                        onChange={(e) => setFormData({...formData, hours: e.target.value})}
                      />
                    </div>

                    {daysCount > 0 && formData.hours && Number(formData.hours) > 0 ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-900 text-sm space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Total Days:</span>
                          <span className="font-medium">{daysCount} day{daysCount > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Total Work Hours:</span>
                          <span className="font-medium">{totalWorkHours} hrs</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200/50 mt-1">
                          <span className="font-bold text-base text-blue-950">Total CTO Credits to Earn:</span>
                          <span className="font-bold text-base text-blue-950">{totalCtoHours} hrs</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}

            {modalType === 'used' && (
              <div className="grid gap-2 mt-4">
                <Label>Hours</Label>
                <div className="p-2.5 bg-muted rounded-md text-sm flex items-center text-muted-foreground border border-muted-foreground/20">
                  <Clock className="w-4 h-4 mr-2" />
                  Fixed at 8 hours (1 full day)
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Reason</Label>
              <Input 
                required 
                placeholder={modalType === 'earned' ? "e.g. Weekend server maintenance" : "e.g. Personal errands"}
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting Request..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Modal (Admin Only) */}
      {isAdminOrManager && (
        <>
          <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
            <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Request</DialogTitle>
              </DialogHeader>
              {selectedEntry && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                    <div>
                      <span className="text-muted-foreground block text-xs">Employee</span>
                      <span className="font-medium">{selectedEntry.user?.first_name} {selectedEntry.user?.last_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Type</span>
                      <span>{getTypeBadge(selectedEntry.type)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Date</span>
                      <span className="font-medium">{format(new Date(selectedEntry.date), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Hours</span>
                      <span className="font-medium">{selectedEntry.hours} hrs</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs">Reason</span>
                      <p className="mt-1">{selectedEntry.reason}</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Review Notes (Optional)</Label>
                    <Input 
                      placeholder="Add a comment or explanation..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={isSubmitting}
                      onClick={() => handleReview("rejected")}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isSubmitting}
                      onClick={() => handleReview("approved")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkReviewModalOpen} onOpenChange={setIsBulkReviewModalOpen}>
            <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Review ({selectedIds.length} requests)</DialogTitle>
                <DialogDescription>
                  You are about to approve or reject {selectedIds.length} pending requests at once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Review Notes (Optional)</Label>
                  <Input 
                    placeholder="Add a common comment for all these requests..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={isSubmitting}
                    onClick={() => handleBulkReview("rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject All
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                    onClick={() => handleBulkReview("approved")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve All
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Calendar Modal */}
      <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overtime & Time Off Calendar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">{format(currentCalendarMonth, "MMMM yyyy")}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentCalendarMonth(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))}>Next</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground pb-2 border-b">
                  {day}
                </div>
              ))}
              
              {(() => {
                const start = startOfWeek(startOfMonth(currentCalendarMonth));
                const end = endOfWeek(endOfMonth(currentCalendarMonth));
                const days = eachDayOfInterval({ start, end });
                
                return days.map((day, i) => {
                  const dayEntries = currentData?.entries.filter(e => e.status !== "rejected" && isSameDay(parseISO(e.date), day)) || [];
                  const isCurrentMonth = isSameMonth(day, currentCalendarMonth);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div 
                      key={i} 
                      className={`min-h-[120px] p-2 border rounded-md flex flex-col transition-all ${
                        !isCurrentMonth ? 'bg-muted/30 text-muted-foreground/50 border-dashed' : 
                        isToday ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 
                        'bg-card hover:bg-muted/20 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-end mb-1.5">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-blue-600 text-white' : ''
                        }`}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[85px] no-scrollbar">
                        {dayEntries.map(e => (
                          <div 
                            key={e.id} 
                            className={`text-xs px-2 py-1.5 rounded-md font-medium truncate border shadow-sm ${
                              e.type === 'earned' 
                                ? 'bg-blue-100/50 text-blue-800 border-blue-200' 
                                : 'bg-purple-100/50 text-purple-800 border-purple-200'
                            }`} 
                            title={`${Number(e.hours)}h - ${e.reason} (${e.status})`}
                          >
                            <span className="font-bold">{Number(e.hours)}h</span> {e.type === 'earned' ? 'OT' : 'Off'}
                            {e.status === 'pending' && <span className="ml-1 opacity-70">(Pending)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
