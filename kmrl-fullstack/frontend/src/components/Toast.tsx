import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { subscribeToToasts, removeToast, getToasts } from "@/lib/toast";

const Toast = () => {
  const [toasts, setToasts] = useState(getToasts());

  useEffect(() => {
    const unsubscribe = subscribeToToasts(setToasts);
    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto animate-slide-in ${
            toast.type === "success"
              ? "bg-revenue text-primary-foreground"
              : toast.type === "error"
              ? "bg-ibl text-primary-foreground"
              : toast.type === "warning"
              ? "bg-standby text-primary-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {toast.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === "warning" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
