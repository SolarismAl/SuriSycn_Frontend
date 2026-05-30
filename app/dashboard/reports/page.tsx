"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Calendar as CalendarIcon, CheckSquare, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";

export default function ReportsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [reportType, setReportType] = useState<"tasks" | "reservations">("tasks");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Security check: Only Admin and Manager can view Reports
  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, isAuthenticated, router]);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return null;
  }

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("format", format);

      const endpoint = `/reports/${reportType}/export?${params.toString()}`;
      
      const response = await api.get(endpoint, {
        responseType: 'blob', // Important for downloading files
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'csv';
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Report generation failed:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl pb-10">
      <div>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-semibold tracking-tight"
        >
          System Reports
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-muted-foreground mt-2"
        >
          Generate and download custom reports for tasks and room reservations.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-6 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl flex flex-col gap-8">
          
          {/* Report Type Selection */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Select Report Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setReportType("tasks")}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  reportType === "tasks" 
                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500" 
                    : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-black/5 dark:bg-white/5"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${reportType === "tasks" ? "bg-blue-500 text-white" : "bg-black/10 dark:bg-white/10 text-muted-foreground"}`}>
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Tasks & Productivity</h4>
                  <p className="text-xs text-muted-foreground mt-1">Export a detailed list of tasks including their status, priority, and assignees.</p>
                </div>
              </button>

              <button
                onClick={() => setReportType("reservations")}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  reportType === "reservations" 
                    ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500" 
                    : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-black/5 dark:bg-white/5"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${reportType === "reservations" ? "bg-purple-500 text-white" : "bg-black/10 dark:bg-white/10 text-muted-foreground"}`}>
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Room Utilization</h4>
                  <p className="text-xs text-muted-foreground mt-1">Export a log of room reservations, tracking usage and approval statuses.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">2. Filter by Date (Optional)</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input 
                  id="start_date"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/50 dark:bg-black/50"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input 
                  id="end_date"
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/50 dark:bg-black/50"
                />
              </div>
            </div>
          </div>

          {/* Format Selection & Action */}
          <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">3. Export Settings</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    value="csv" 
                    checked={format === "csv"} 
                    onChange={() => setFormat("csv")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium">CSV (Excel)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    value="pdf" 
                    checked={format === "pdf"} 
                    onChange={() => setFormat("pdf")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium">PDF Document</span>
                </label>
              </div>

              <Button 
                size="lg"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>

            </div>
          </div>

        </Card>
      </motion.div>
    </div>
  );
}
