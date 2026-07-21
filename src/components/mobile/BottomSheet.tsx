import { useState, useEffect, useCallback } from "react";
import { X, GripHorizontal } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: "auto" | "half" | "full";
}

export default function BottomSheet({ isOpen, onClose, title, children, height = "auto" }: BottomSheetProps) {
  const [closing, setClosing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchY, setTouchY] = useState(0);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 250);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setClosing(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setTouchY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStart;
    if (diff > 0) setTouchY(diff);
  };

  const handleTouchEnd = () => {
    if (touchY > 80) handleClose();
    setTouchY(0);
  };

  if (!isOpen) return null;

  const heightClass = height === "full" ? "h-[92vh]" : height === "half" ? "h-[60vh]" : "max-h-[85vh]";
  const transformStyle = touchY > 0 ? { transform: `translateY(${touchY}px)` } : {};

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bottom-sheet-backdrop transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />
      {/* Sheet */}
      <div
        className={`relative bg-white w-full md:w-[480px] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col z-10 overflow-hidden ${heightClass} ${closing ? "animate-slide-down" : "animate-slide-up"}`}
        style={transformStyle}
      >
        {/* Drag Handle */}
        <div
          className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <GripHorizontal size={24} className="text-[#CBD5E1]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#F1F5F9]">
          <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-[#F1F5F9] transition-colors">
            <X size={18} className="text-[#64748B]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}
