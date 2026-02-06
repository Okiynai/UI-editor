import React, { useEffect, useMemo, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastListener = (items: ToastItem[]) => void;

const listeners = new Set<ToastListener>();
let items: ToastItem[] = [];

const notify = () => {
  listeners.forEach((listener) => listener(items));
};

const removeToast = (id: string) => {
  items = items.filter((item) => item.id !== id);
  notify();
};

const addToast = (message: string, variant: ToastVariant) => {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  items = [{ id, message, variant }, ...items].slice(0, 5);
  notify();

  window.setTimeout(() => {
    removeToast(id);
  }, 3500);
};

export const toast = Object.assign(
  (message: string) => addToast(message, "info"),
  {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    info: (message: string) => addToast(message, "info"),
  }
);

export const ToastViewport = () => {
  const [visibleItems, setVisibleItems] = useState<ToastItem[]>(() => items);

  useEffect(() => {
    const handler: ToastListener = (next) => setVisibleItems(next);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const content = useMemo(
    () =>
      visibleItems.map((item) => (
        <div key={item.id} className={`app-toast app-toast--${item.variant}`}>
          <div className="app-toast__dot" />
          <div className="app-toast__message">{item.message}</div>
          <button
            type="button"
            className="app-toast__close"
            onClick={() => removeToast(item.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )),
    [visibleItems]
  );

  return <div className="app-toast-viewport">{content}</div>;
};
