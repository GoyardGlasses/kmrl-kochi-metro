type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const toasts: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

export const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
  const id = Math.random().toString(36).slice(2);
  const toast: Toast = { id, type, message, duration };
  toasts.push(toast);
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
};

export const removeToast = (id: string) => {
  const index = toasts.findIndex((t) => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notifyListeners();
  }
};

export const getToasts = () => toasts;

export const subscribeToToasts = (listener: (toasts: Toast[]) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toasts]));
};
