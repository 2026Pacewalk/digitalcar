import { useAuth } from "@/hooks/useAuth";
import { type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  const sidebarWidth = 280;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-[#999999]">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}
