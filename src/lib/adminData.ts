/*
 * Fetch an admin-only data file through the authenticated endpoint instead of
 * the raw public URL. The server verifies the super-admin JWT and only then
 * returns the file — so sensitive data (passwords, bank details) is never
 * publicly downloadable.
 */
export function fetchAdminData<T = unknown>(file: "customers"): Promise<T> {
  return fetch(`/api/admin/data/${file}`, {
    headers: { "x-auth-token": localStorage.getItem("auth_token") || "" },
  }).then((r) => {
    if (!r.ok) throw new Error(r.status === 401 ? "Not authorised" : "Could not load data");
    return r.json() as Promise<T>;
  });
}
