import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";

export interface DashboardStats {
  total_employees: number;
  pending_approvals: number;
  tasks_progress: number;
  today_reservations: number;
}

export interface Reservation {
  id: string;
  room_name: string;
  start_time: string;
  end_time: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  progress: number;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  stats: DashboardStats;
  today_schedule: Reservation[];
  pending_approvals: Reservation[];
  announcements: Announcement[];
  recent_tasks: Task[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{ data: DashboardData }>("/dashboard");
      setData(response.data.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard data");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, isLoading, error, refetch: fetchDashboard };
}
