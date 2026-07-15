"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-[#4A3E3D]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-[#FBF8F3] rounded-t-3xl sm:rounded-3xl border-2 border-[#E8DFD4] w-full max-w-md max-h-[min(92dvh,100%)] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-xl font-semibold text-[#4A3E3D]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#E8DFD4] transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 min-h-0">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-[#E8DFD4]/60 bg-[#FBF8F3]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
