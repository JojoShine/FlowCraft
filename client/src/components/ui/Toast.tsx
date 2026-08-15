import * as ToastPrimitive from '@radix-ui/react-toast';
import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

type ToastVariant = 'default' | 'success' | 'error';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  addToast: (title: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { ...msg, id }]);
  }, []);

  const addToast = useCallback((title: string, variant: ToastVariant = 'default') => {
    toast({ title, variant });
  }, [toast]);

  const remove = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, addToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {messages.map((msg) => (
          <ToastItem key={msg.id} message={msg} onRemove={() => remove(msg.id)} />
        ))}
        <ToastPrimitive.Viewport
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column-reverse',
            alignItems: 'center',
            gap: 8,
            maxWidth: 400,
            width: '100%',
            outline: 'none',
            listStyle: 'none',
            padding: '0 16px',
            margin: 0,
            pointerEvents: 'none',
          }}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

function ToastItem({ message, onRemove }: { message: ToastMessage; onRemove: () => void }) {
  const variant = message.variant || 'default';

  return (
    <ToastPrimitive.Root
      duration={3000}
      onOpenChange={(open) => { if (!open) onRemove(); }}
      style={{
        background: 'var(--ink)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: "'Geist', sans-serif",
        pointerEvents: 'auto',
        animation: 'toastSlideUp 200ms ease-out',
        border: '1px solid var(--border-default)',
      }}
    >
      <div style={{
        width: 16,
        height: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {variant === 'success' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--canvas)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {variant === 'error' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--canvas)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {variant === 'default' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--canvas)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.6 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ToastPrimitive.Title style={{ fontSize: 13, fontWeight: 500, color: 'var(--canvas)', lineHeight: 1.4 }}>
          {message.title}
        </ToastPrimitive.Title>
        {message.description && (
          <ToastPrimitive.Description style={{ fontSize: 12, color: 'var(--canvas)', opacity: 0.6, marginTop: 2 }}>
            {message.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 2,
          color: 'var(--canvas)',
          opacity: 0.5,
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
