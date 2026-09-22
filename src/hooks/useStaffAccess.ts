import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { getSessionUser } from "@/lib/session";
import { hasAccess, moduleForAdminPath, type StaffLevel, type StaffModule, type StaffPermissions } from "@contracts/staff";

/* What the signed-in admin-portal user may open. The super admin may open
   everything; a staff member only the modules granted on the Staff page. The
   server enforces the same rules on every request — this only decides what
   the UI shows. */
export function useStaffAccess() {
  const { user } = useAuth();
  // useAuth fills in the user after its first render; read the session directly
  // so the very first access check already knows who this is.
  const role = user?.role ?? (typeof window !== "undefined" ? getSessionUser<{ role?: string }>()?.role : undefined);
  const isStaff = role === "staff";
  const isSuper = role === "super_admin";
  const q = trpc.staff.myAccess.useQuery(undefined, { enabled: isStaff, staleTime: 60_000, retry: false });
  const perms = (q.data?.permissions ?? {}) as StaffPermissions;

  const can = (module: StaffModule, level: StaffLevel = "view") => isSuper || (isStaff && hasAccess(perms, module, level));
  const canOpenPath = (path: string) => {
    if (isSuper) return true;
    if (!isStaff) return false;
    const clean = path.split("?")[0];
    if (clean === "/admin/profile") return true;
    const m = moduleForAdminPath(clean);
    return !!m && hasAccess(perms, m, "view");
  };

  return {
    isStaff,
    isSuper,
    loading: isStaff && q.isPending,
    can,
    canOpenPath,
    canImpersonate: isSuper || (isStaff && !!q.data?.canImpersonate && hasAccess(perms, "customers", "view")),
    home: isSuper ? "/admin" : (q.data?.home ?? "/admin/profile"),
    jobTitle: q.data?.jobTitle ?? null,
  };
}
