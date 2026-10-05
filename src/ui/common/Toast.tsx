import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ToastAction { label: string; run: () => void }
interface ToastMsg { id: number; text: string; action?: ToastAction }
type ShowToast = (text: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const show = useCallback<ShowToast>((text, action) => setMsg({ id: Date.now(), text, action }), []);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {msg && (
          <div className="toast" key={msg.id}>
            <span>{msg.text}</span>
            {msg.action && (
              <button type="button" className="toast__action" onClick={() => { msg.action!.run(); setMsg(null); }}>
                {msg.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
