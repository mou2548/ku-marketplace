'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface SessionData {
  accessToken?: string;
  email?: string;
  isAdmin?: boolean;
  lastOtp?: string;
  itemId?: number;
  postId?: number;
  offerId?: number;
  transactionId?: number;
  appointmentId?: number;
  giveawayId?: number;
  ticketId?: number;
  recipientId?: number;
  reportId?: number;
  appealId?: number;
  paymentId?: number;
  lastQrToken?: string;
  lastUploadUrl?: string;
}

const STORAGE_KEY = 'ku_console_session';

const SessionContext = createContext<{
  session: SessionData;
  update: (patch: Partial<SessionData>) => void;
  reset: () => void;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        /* ignore corrupt storage */
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session, hydrated]);

  const update = useCallback((patch: Partial<SessionData>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSession({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('ku_console_access_token');
  }, []);

  return (
    <SessionContext.Provider value={{ session, update, reset }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
