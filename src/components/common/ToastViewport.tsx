import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useAuthWorkspace } from '../../store/useAuthWorkspaceStore';

export const ToastViewport: React.FC = () => {
  const { toasts, dismissToast } = useAuthWorkspace();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isErr = toast.type === 'error';
        const isOk = toast.type === 'success';
        return (
          <div
            key={toast.id}
            role={isErr ? 'alert' : 'status'}
            className={`pointer-events-auto p-3.5 rounded-lg border shadow-lg flex items-start gap-2.5 text-xs ${
              isErr
                ? 'bg-[#261717] border-red-500/50 text-red-100'
                : isOk
                ? 'bg-[#13221D] border-[#4CC38A]/50 text-[#F2F4F7]'
                : 'bg-[#1A2029] border-[#1686C9]/50 text-[#F2F4F7]'
            }`}
          >
            {isErr ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : isOk ? (
              <CheckCircle2 className="w-4 h-4 text-[#4CC38A] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#1686C9] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{toast.title}</div>
              {toast.detail && (
                <div className="text-[11px] opacity-85 mt-0.5 break-words">{toast.detail}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
