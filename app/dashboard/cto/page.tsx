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

type OfficeOrder = {
  id: string;
  memo_number: string | null;
  subject: string;
  description: string | null;
  date_issued: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  users?: { id: string; first_name: string; last_name: string }[];
};

type CtoEntry = {
  id: string;
  user_id: string;
  office_order_id: string | null;
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
  office_order?: OfficeOrder;
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
    office_order_id: "none",
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
  const [currentPage, setCurrentPage] = useState(1);

  const [officeOrders, setOfficeOrders] = useState<OfficeOrder[]>([]);
  const [isOfficeOrderModalOpen, setIsOfficeOrderModalOpen] = useState(false);
  const [editingOfficeOrder, setEditingOfficeOrder] = useState<OfficeOrder | null>(null);
  const [officeOrderForm, setOfficeOrderForm] = useState({
    memo_number: "", subject: "", description: "", 
    date_issued: format(new Date(), "yyyy-MM-dd"), 
    valid_from: format(new Date(), "yyyy-MM-dd"), 
    valid_until: format(addDays(new Date(), 7), "yyyy-MM-dd"), 
    is_active: true, user_ids: [] as string[]
  });

  const fetchOfficeOrders = async () => {
    try {
      const res = await api.get("/office-orders");
      setOfficeOrders(res.data.data);
    } catch (e) { console.error("Failed to fetch office orders", e); }
  };

  useEffect(() => {
    if (user) {
      fetchOfficeOrders();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUserId]);
  useEffect(() => {
    if (isAdminOrManager) {
      api.get("/users").then(res => setUsers(res.data.data)).catch(console.error);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    if (user && !isAdminOrManager && selectedUserId === "all") {
      setSelectedUserId(user.id.toString());
    }
  }, [user, isAdminOrManager, selectedUserId]);

  useEffect(() => {
    if (user) {
      if (selectedUserId === "all" && !isAdminOrManager) return;
      fetchData(selectedUserId);
    }
  }, [selectedUserId, fetchData, user, isAdminOrManager]);

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
    if (formData.office_order_id === "none") {
      toast.error("Please select an Office Order to charge this request to.");
      return;
    }

    if (formData.office_order_id !== "none") {
      const selectedOO = officeOrders.find(oo => oo.id === formData.office_order_id);
      if (selectedOO) {
        const selectedDate = parseISO(formData.date);
        const validFrom = parseISO(selectedOO.valid_from);
        const validUntil = parseISO(selectedOO.valid_until);
        selectedDate.setHours(0,0,0,0);
        validFrom.setHours(0,0,0,0);
        validUntil.setHours(0,0,0,0);
        
        if (selectedDate < validFrom || selectedDate > validUntil) {
          toast.error(`The selected start date must be between ${format(validFrom, 'MMM d, yyyy')} and ${format(validUntil, 'MMM d, yyyy')} for the selected Office Order.`);
          return;
        }

        if (formData.endDate) {
          const selectedEndDate = parseISO(formData.endDate);
          selectedEndDate.setHours(0,0,0,0);
          if (selectedEndDate < validFrom || selectedEndDate > validUntil) {
            toast.error(`The selected end date must be between ${format(validFrom, 'MMM d, yyyy')} and ${format(validUntil, 'MMM d, yyyy')} for the selected Office Order.`);
            return;
          }
        }
      }
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
          office_order_id: formData.office_order_id !== "none" ? formData.office_order_id : null,
        });
      }

      toast.success(datesToSubmit.length > 1 ? `Successfully submitted ${datesToSubmit.length} requests` : "Request submitted successfully");
      setIsModalOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), endDate: "", startTime: "", endTime: "", hours: "", reason: "", isHoliday: false, office_order_id: "none" });
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

  const handleOfficeOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeOrderForm.subject) return toast.error("Subject is required");
    if (officeOrderForm.user_ids.length === 0) return toast.error("Please assign at least one employee");
    if (isAfter(parseISO(officeOrderForm.valid_from), parseISO(officeOrderForm.valid_until))) return toast.error("Valid From must be before Valid Until");

    try {
      setIsSubmitting(true);
      if (editingOfficeOrder) {
        await api.put(`/office-orders/${editingOfficeOrder.id}`, officeOrderForm);
        toast.success("Office order updated successfully");
      } else {
        await api.post("/office-orders", officeOrderForm);
        toast.success("Office order created successfully");
      }
      setEditingOfficeOrder(null);
      setOfficeOrderForm({ memo_number: "", subject: "", description: "", date_issued: format(new Date(), "yyyy-MM-dd"), valid_from: format(new Date(), "yyyy-MM-dd"), valid_until: format(addDays(new Date(), 7), "yyyy-MM-dd"), is_active: true, user_ids: [] });
      fetchOfficeOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save office order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfficeOrderDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this office order?")) return;
    try {
      await api.delete(`/office-orders/${id}`);
      toast.success("Office order deleted successfully");
      fetchOfficeOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete office order");
    }
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const paginatedEntries = entries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
          {isAdminOrManager && (
            <Button 
              variant="outline"
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setIsOfficeOrderModalOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Manage Office Orders
            </Button>
          )}
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
                  {paginatedEntries.map((entry) => (
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
                      <td className="px-4 py-3 max-w-[200px] truncate" title={entry.reason}>
                        {entry.office_order && (
                          <Badge variant="outline" className="mr-2 bg-muted/50 font-mono text-[10px]" title={entry.office_order.subject}>
                            {entry.office_order.memo_number || 'MEMO'}
                          </Badge>
                        )}
                        {entry.reason}
                      </td>
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
          
          {totalPages > 1 && entries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-muted/50 px-2 py-3 sm:px-6 mt-2 rounded-md bg-muted/10 gap-4">
              <div>
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, entries.length)}</span> of <span className="font-medium text-foreground">{entries.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-r-none h-8 text-xs"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4 border-y border-input bg-background text-xs font-medium text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none h-8 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </nav>
              </div>
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
              <div className="grid gap-2">
                <Label>Charge to Office Order / Memorandum <span className="text-red-500">*</span></Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.office_order_id}
                  onChange={(e) => setFormData({...formData, office_order_id: e.target.value})}
                  required
                >
                  <option value="none" disabled>-- Select Office Order --</option>
                  {officeOrders.map(oo => {
                    try {
                      const validFrom = format(parseISO(oo.valid_from), 'MMM d, yyyy');
                      const validUntil = format(parseISO(oo.valid_until), 'MMM d, yyyy');
                      return (
                        <option key={oo.id} value={oo.id}>
                          {oo.memo_number ? `${oo.memo_number} - ` : ''}{oo.subject} ({validFrom} - {validUntil})
                        </option>
                      );
                    } catch (e) {
                      return (
                        <option key={oo.id} value={oo.id}>
                          {oo.memo_number ? `${oo.memo_number} - ` : ''}{oo.subject}
                        </option>
                      );
                    }
                  })}
                </select>
                {officeOrders.length === 0 && (
                  <p className="text-xs text-red-500">You do not have any active Office Orders assigned to you.</p>
                )}
              </div>
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

      {/* Office Orders Admin Modal */}
      <Dialog open={isOfficeOrderModalOpen} onOpenChange={setIsOfficeOrderModalOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Office Orders</DialogTitle>
            <DialogDescription>
              Create or manage official memorandums and office orders. Employees can tie their CTO logs to these orders.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Form Section */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold">{editingOfficeOrder ? 'Edit' : 'Create New'} Office Order</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-2">
                  <Label>Memo Number (Optional)</Label>
                  <Input 
                    placeholder="e.g. OO-2026-001" 
                    value={officeOrderForm.memo_number}
                    onChange={(e) => setOfficeOrderForm({...officeOrderForm, memo_number: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Subject / Title <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="Authority to Render Overtime..." 
                    value={officeOrderForm.subject}
                    onChange={(e) => setOfficeOrderForm({...officeOrderForm, subject: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valid From <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={officeOrderForm.valid_from}
                      onChange={(e) => setOfficeOrderForm({...officeOrderForm, valid_from: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valid Until <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={officeOrderForm.valid_until}
                      onChange={(e) => setOfficeOrderForm({...officeOrderForm, valid_until: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Date Issued</Label>
                  <Input 
                    type="date"
                    value={officeOrderForm.date_issued}
                    onChange={(e) => setOfficeOrderForm({...officeOrderForm, date_issued: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Authorized Employees <span className="text-red-500">*</span></Label>
                  <div className="border rounded-md max-h-40 overflow-y-auto p-2 bg-muted/10">
                    {users.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Loading users...</span>
                    ) : (
                      users.map(u => (
                        <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={officeOrderForm.user_ids.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOfficeOrderForm({...officeOrderForm, user_ids: [...officeOrderForm.user_ids, u.id]});
                              } else {
                                setOfficeOrderForm({...officeOrderForm, user_ids: officeOrderForm.user_ids.filter(id => id !== u.id)});
                              }
                            }}
                          />
                          {u.first_name} {u.last_name}
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={officeOrderForm.is_active}
                    onChange={(e) => setOfficeOrderForm({...officeOrderForm, is_active: e.target.checked})}
                  />
                  <span className="text-sm font-medium">Active (Visible to users)</span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  {editingOfficeOrder && (
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setEditingOfficeOrder(null);
                        setOfficeOrderForm({ memo_number: "", subject: "", description: "", date_issued: format(new Date(), "yyyy-MM-dd"), valid_from: format(new Date(), "yyyy-MM-dd"), valid_until: format(addDays(new Date(), 7), "yyyy-MM-dd"), is_active: true, user_ids: [] });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button onClick={handleOfficeOrderSubmit} disabled={isSubmitting}>
                    {editingOfficeOrder ? 'Save Changes' : 'Create Office Order'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* List Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Existing Office Orders</h3>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-2">
                {officeOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center pt-8">No office orders found.</p>
                ) : (
                  officeOrders.map(oo => (
                    <div key={oo.id} className={`p-3 border rounded-md relative group transition-colors hover:shadow-sm ${!oo.is_active ? 'bg-muted/30 opacity-70' : 'bg-card'}`}>
                      <div className="flex justify-between items-start gap-2 pr-14">
                        <div>
                          <h4 className="font-medium text-sm leading-tight mb-1">{oo.memo_number ? `${oo.memo_number}: ` : ''}{oo.subject}</h4>
                          <p className="text-xs text-muted-foreground mb-2">Valid: {format(parseISO(oo.valid_from), 'MMM d, yyyy')} - {format(parseISO(oo.valid_until), 'MMM d, yyyy')}</p>
                          <div className="flex flex-wrap gap-1">
                            {oo.users?.slice(0, 3).map(u => (
                              <Badge key={u.id} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-normal">
                                {u.first_name} {u.last_name[0]}.
                              </Badge>
                            ))}
                            {(oo.users?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-[10px] bg-muted font-normal">
                                +{(oo.users?.length || 0) - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-none ${oo.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          {oo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur rounded p-1 shadow-sm border">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingOfficeOrder(oo);
                            setOfficeOrderForm({
                              memo_number: oo.memo_number || "",
                              subject: oo.subject,
                              description: oo.description || "",
                              date_issued: oo.date_issued.split('T')[0],
                              valid_from: oo.valid_from.split('T')[0],
                              valid_until: oo.valid_until.split('T')[0],
                              is_active: oo.is_active,
                              user_ids: oo.users?.map(u => u.id) || []
                            });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleOfficeOrderDelete(oo.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
