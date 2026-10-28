'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: Tone; message: string }
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const tones = { success: 'bg-emerald-700', error: 'bg-red-700', info: 'bg-ink' };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${tones[t.tone]}`}>
            <span className="flex-1">{t.message}</span>
            <button type="button" className="opacity-80 hover:opacity-100" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
