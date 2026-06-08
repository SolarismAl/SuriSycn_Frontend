import { create } from 'zustand';
import { api } from '@/lib/axios';

export type CtoEntry = {
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

export type CtoBalance = {
  total_earned: string;
  total_used: string;
  available_balance: string;
  pending_earned: string;
  pending_used: string;
};

export type CtoOverviewItem = {
  id: string;
  name: string;
  available_balance: number;
};

type CtoState = {
  cache: Record<string, { entries: CtoEntry[], balance: CtoBalance | CtoOverviewItem[] }>;
  loading: boolean;
  fetchData: (userId: string, force?: boolean) => Promise<void>;
};

export const useCtoStore = create<CtoState>((set, get) => ({
  cache: {},
  loading: false,
  fetchData: async (userId: string, force = false) => {
    // If not forcing and cache exists, instant load
    if (!force && get().cache[userId]) {
      return;
    }
    
    set({ loading: true });
    try {
      const balanceEndpoint = userId === 'all' ? '/cto/overview' : `/cto/balance?user_id=${userId}`;
      const [entriesRes, balanceRes] = await Promise.all([
        api.get(`/cto?user_id=${userId}`),
        api.get(balanceEndpoint)
      ]);
      set((state) => ({
        cache: {
          ...state.cache,
          [userId]: {
            entries: entriesRes.data.data,
            balance: balanceRes.data.data,
          }
        }
      }));
    } catch (error) {
      console.error("Failed to load CTO data", error);
    } finally {
      set({ loading: false });
    }
  },
}));
