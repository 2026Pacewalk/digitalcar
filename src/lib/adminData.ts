/*
 * Fetch data through authenticated endpoints instead of raw public URLs. The
 * server verifies the JWT and scopes what it returns — so sensitive data
 * (passwords, bank details, other users' leads) is never publicly downloadable.
 */
const authHeaders = () => ({ "x-auth-token": localStorage.getItem("auth_token") || "" });

/** Super-admin-only files (customers / enquiries). */
export function fetchAdminData<T = unknown>(file: "customers" | "enquiries"): Promise<T> {
  return fetch(`/api/admin/data/${file}`, { headers: authHeaders() }).then((r) => {
    if (!r.ok) throw new Error(r.status === 401 ? "Not authorised" : "Could not load data");
    return r.json() as Promise<T>;
  });
}

/** The signed-in customer's OWN leads only (scoped server-side by their slug). */
export function fetchMyLeads<T = unknown>(): Promise<T> {
  return fetch("/api/my/leads", { headers: authHeaders() }).then((r) => {
    if (!r.ok) throw new Error("Could not load leads");
    return r.json() as Promise<T>;
  });
}
