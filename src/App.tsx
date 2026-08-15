import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { getToken, getSessionUser, setSessionUser, clearSession } from "@/lib/session";
import PublicLayout from "@/components/layout/PublicLayout";
const CustomDomainCard = lazy(() => import("@/components/CustomDomainCard"));

// Hosts that are the DigitalCarda app itself (never treated as a custom card domain).
function isCustomHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return false;
  if (host === "digitalcarda.in" || host.endsWith(".digitalcarda.in")) return false;
  // Ignore preview/staging hosts so only real customer domains resolve as cards.
  if (host.endsWith(".vercel.app") || host.endsWith(".onrender.com") || host.endsWith(".netlify.app")) return false;
  return host.includes("."); // a real FQDN → treat as a custom card domain
}

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BecomeReseller = lazy(() => import("./pages/BecomeReseller"));
const AdminResellerApplications = lazy(() => import("./pages/admin/ResellerApplications"));
const Home = lazy(() => import("./pages/public/Home"));
const Features = lazy(() => import("./pages/public/Features"));
const Marketplace = lazy(() => import("./pages/public/Marketplace"));
const ProductDetail = lazy(() => import("./pages/public/ProductDetail"));
const CardDemo = lazy(() => import("./pages/public/CardDemo"));
const Industries = lazy(() => import("./pages/public/Industries"));
const Pricing = lazy(() => import("./pages/public/Pricing"));
const BulkCards = lazy(() => import("./pages/public/BulkCards"));
const AIGenerator = lazy(() => import("./pages/public/AIGenerator"));
const Resellers = lazy(() => import("./pages/public/Resellers"));
const ReferEarnPublic = lazy(() => import("./pages/public/ReferEarn"));
const CustomDomain = lazy(() => import("./pages/public/CustomDomain"));
const Contact = lazy(() => import("./pages/public/Contact"));
const Privacy = lazy(() => import("./pages/public/Privacy"));
const RefundPolicy = lazy(() => import("./pages/public/RefundPolicy"));
const TermsOfService = lazy(() => import("./pages/public/TermsOfService"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminResellers = lazy(() => import("./pages/admin/Resellers"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminPackages = lazy(() => import("./pages/admin/Packages"));
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminMigration = lazy(() => import("./pages/admin/Migration"));
const AdminUrlConflicts = lazy(() => import("./pages/admin/UrlConflicts"));
const AdminDomains = lazy(() => import("./pages/admin/Domains"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminBulkOrders = lazy(() => import("./pages/admin/BulkOrders"));
const AdminAiGenerator = lazy(() => import("./pages/admin/AiGenerator"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminPaymentOrders = lazy(() => import("./pages/admin/PaymentOrders"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));
const ResellerDashboard = lazy(() => import("./pages/reseller/Dashboard"));
const ResellerCustomers = lazy(() => import("./pages/reseller/Customers"));
const ResellerPaymentOrders = lazy(() => import("./pages/reseller/PaymentOrders"));
const ResellerProfile = lazy(() => import("./pages/reseller/Profile"));
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CardTemplateEditor = lazy(() => import("./pages/customer/CardTemplateEditor"));
const CustomerTemplates = lazy(() => import("./pages/customer/Templates"));
const CustomerCards = lazy(() => import("./pages/customer/Cards"));
const CustomerBulkCreate = lazy(() => import("./pages/customer/BulkCreate"));
const CustomerAnalytics = lazy(() => import("./pages/customer/Analytics"));
const CustomerLeads = lazy(() => import("./pages/customer/Leads"));
const CustomerSubscription = lazy(() => import("./pages/customer/Subscription"));
const CustomerBilling = lazy(() => import("./pages/customer/Billing"));
const CustomerSettings = lazy(() => import("./pages/customer/Settings"));
const CustomerProfile = lazy(() => import("./pages/customer/Profile"));
const CustomerQR = lazy(() => import("./pages/customer/QR"));
const CustomerCustomDomain = lazy(() => import("./pages/customer/CustomDomain"));
const AITools = lazy(() => import("./pages/customer/AITools"));
const CustomerHome = lazy(() => import("./pages/customer/Home"));
const CardStudio = lazy(() => import("./pages/customer/CardStudio"));
const CustomerAbout = lazy(() => import("./pages/customer/About"));
const CustomerProducts = lazy(() => import("./pages/customer/Products"));
const CustomerPayments = lazy(() => import("./pages/customer/Payments"));
const CustomerMedia = lazy(() => import("./pages/customer/Media"));
const CustomerSocial = lazy(() => import("./pages/customer/Social"));
const CustomerUploads = lazy(() => import("./pages/customer/Uploads"));
const CustomerViewCard = lazy(() => import("./pages/customer/ViewCard"));
const CustomerReviews = lazy(() => import("./pages/customer/Reviews"));
const CustomerReferEarn = lazy(() => import("./pages/customer/ReferEarn"));
const PublicCard = lazy(() => import("./pages/PublicCard"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { Toaster } from "@/components/ui/sonner";
import EnquiryToaster from "@/components/EnquiryToaster";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
    <div className="w-8 h-8 border-2 border-[#F7B31C] border-t-transparent rounded-full animate-spin" />
  </div>
);

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();
  const hasToken = typeof window !== "undefined" && !!getToken();

  // Verify the session against the server. The stored role in localStorage is
  // user-editable, so access is gated on the role the backend reports for the
  // JWT — a hand-edited role can't unlock an area the account isn't allowed in.
  const me = trpc.auth.me.useQuery(undefined, { enabled: hasToken, retry: false, staleTime: 60_000 });

  // Reconcile the cached user with the server truth so the whole shell (sidebar,
  // top bar) reflects the real role. Only reloads when it was actually wrong.
  useEffect(() => {
    if (!me.data) return;
    try {
      const stored = getSessionUser() as { id?: number; role?: string; email?: string; fullName?: string } | null;
      // Reconcile on ANY identity drift — id, role, email or name. Comparing only
      // id/role let a renamed or re-emailed account (same id) keep showing a stale
      // cached identity in the header (e.g. an old "Nipun Garg" for md@pacewalk).
      const drift = !stored || stored.id !== me.data.id || stored.role !== me.data.role
        || stored.email !== me.data.email || stored.fullName !== me.data.fullName;
      if (drift) {
        setSessionUser({
          id: me.data.id, email: me.data.email, fullName: me.data.fullName,
          role: me.data.role, avatar: me.data.avatar ?? undefined,
        });
        window.location.reload();
      }
    } catch { /* ignore */ }
  }, [me.data]);

  // Invalid / expired token → clear the session and send to login.
  const errData = me.error?.data as { code?: string; httpStatus?: number } | null | undefined;
  if (hasToken && me.error && (errData?.code === "UNAUTHORIZED" || errData?.httpStatus === 401)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (isLoading || (hasToken && me.isLoading)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Prefer the server-verified role for the access decision.
  const role = me.data?.role ?? user.role;
  if (!allowedRoles.includes(role)) {
    if (role === "super_admin") return <Navigate to="/admin" replace />;
    if (role === "reseller") return <Navigate to="/reseller" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/* Old product URL /digital-business-cards/:slug → new /digital-business-cards-templates/:slug */
function LegacyProductRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/digital-business-cards-templates/${slug ?? ""}`} replace />;
}

export default function App() {
  // On a custom domain (card.acme.com) short-circuit all routing and render the
  // linked card. digitalcarda.in and localhost fall through to the normal app.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (isCustomHost(host)) {
    return (
      <>
        <Toaster position="top-center" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="w-8 h-8 rounded-full border-2 border-[#E2E8F0] border-t-[#F7B31C] animate-spin" /></div>}>
          <CustomDomainCard host={host} />
        </Suspense>
      </>
    );
  }
  return (
    <>
      <Toaster position="top-center" />
      <EnquiryToaster />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="w-8 h-8 rounded-full border-2 border-[#E2E8F0] border-t-[#F7B31C] animate-spin" /></div>}>
      <Routes>
        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/digital-business-cards-templates" element={<Marketplace />} />
          <Route path="/digital-business-cards-templates/:slug" element={<ProductDetail />} />
          {/* Old URLs → the consolidated Templates page (keeps existing links & SEO alive) */}
          <Route path="/templates" element={<Navigate to="/digital-business-cards-templates" replace />} />
          <Route path="/digital-business-cards" element={<Navigate to="/digital-business-cards-templates" replace />} />
          <Route path="/digital-business-cards/:slug" element={<LegacyProductRedirect />} />
          <Route path="/demo/:slug" element={<CardDemo />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/bulk-cards" element={<BulkCards />} />
          <Route path="/ai-card-generator" element={<AIGenerator />} />
          <Route path="/resellers" element={<Resellers />} />
          <Route path="/refer-earn" element={<ReferEarnPublic />} />
          <Route path="/custom-domain" element={<CustomDomain />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        {/* Unadvertised admin login — set VITE_ADMIN_LOGIN_SLUG in .env to your own secret slug */}
        <Route path={`/${import.meta.env.VITE_ADMIN_LOGIN_SLUG || "control-signin"}`} element={<Login adminMode />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/become-reseller" element={<BecomeReseller />} />

        {/* Public card */}
        <Route path="/c/:slug" element={<PublicCard />} />

        {/* Admin */}
        <Route path="/admin" element={<RoleRoute allowedRoles={["super_admin"]}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/resellers" element={<RoleRoute allowedRoles={["super_admin"]}><AdminResellers /></RoleRoute>} />
        <Route path="/admin/reseller-applications" element={<RoleRoute allowedRoles={["super_admin"]}><AdminResellerApplications /></RoleRoute>} />
        <Route path="/admin/customers" element={<RoleRoute allowedRoles={["super_admin"]}><AdminCustomers /></RoleRoute>} />
        <Route path="/admin/products" element={<RoleRoute allowedRoles={["super_admin"]}><AdminProducts /></RoleRoute>} />
        <Route path="/admin/packages" element={<RoleRoute allowedRoles={["super_admin"]}><AdminPackages /></RoleRoute>} />
        <Route path="/admin/templates" element={<RoleRoute allowedRoles={["super_admin"]}><AdminTemplates /></RoleRoute>} />
        <Route path="/admin/migration" element={<RoleRoute allowedRoles={["super_admin"]}><AdminMigration /></RoleRoute>} />
        <Route path="/admin/url-conflicts" element={<RoleRoute allowedRoles={["super_admin"]}><AdminUrlConflicts /></RoleRoute>} />
        <Route path="/admin/domains" element={<RoleRoute allowedRoles={["super_admin"]}><AdminDomains /></RoleRoute>} />
        {/* Analytics is now merged into the Dashboard — keep the path as a redirect for old links */}
        <Route path="/admin/analytics" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/leads" element={<RoleRoute allowedRoles={["super_admin"]}><AdminLeads /></RoleRoute>} />
        <Route path="/admin/bulk-orders" element={<RoleRoute allowedRoles={["super_admin"]}><AdminBulkOrders /></RoleRoute>} />
        <Route path="/admin/ai-generator" element={<RoleRoute allowedRoles={["super_admin"]}><AdminAiGenerator /></RoleRoute>} />
        <Route path="/admin/referrals" element={<RoleRoute allowedRoles={["super_admin"]}><AdminReferrals /></RoleRoute>} />
        {/* Payment settings moved into Settings → Payment. Keep the old path working. */}
        <Route path="/admin/payments" element={<Navigate to="/admin/settings?tab=payment" replace />} />
        <Route path="/admin/payment-orders" element={<RoleRoute allowedRoles={["super_admin"]}><AdminPaymentOrders /></RoleRoute>} />
        <Route path="/admin/settings" element={<RoleRoute allowedRoles={["super_admin"]}><AdminSettings /></RoleRoute>} />
        <Route path="/admin/profile" element={<RoleRoute allowedRoles={["super_admin"]}><AdminProfile /></RoleRoute>} />

        {/* Reseller */}
        <Route path="/reseller" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerDashboard /></RoleRoute>} />
        <Route path="/reseller/customers" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerCustomers /></RoleRoute>} />
        <Route path="/reseller/payments" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerPaymentOrders /></RoleRoute>} />
        <Route path="/reseller/profile" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerProfile /></RoleRoute>} />

        {/* Customer */}
        <Route path="/dashboard" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerDashboard /></RoleRoute>} />
        {/* Old block builder retired — creating goes through the template editor. */}
        <Route path="/dashboard/builder" element={<Navigate to="/dashboard/cards" replace />} />
        <Route path="/dashboard/builder/:cardId" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CardTemplateEditor /></RoleRoute>} />
        <Route path="/dashboard/templates" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerTemplates /></RoleRoute>} />
        <Route path="/dashboard/cards" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerCards /></RoleRoute>} />
        <Route path="/dashboard/bulk" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerBulkCreate /></RoleRoute>} />
        <Route path="/dashboard/refer" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerReferEarn /></RoleRoute>} />
        <Route path="/dashboard/analytics" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerAnalytics /></RoleRoute>} />
        <Route path="/dashboard/leads" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerLeads /></RoleRoute>} />
        <Route path="/dashboard/subscription" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSubscription /></RoleRoute>} />
        <Route path="/dashboard/billing" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerBilling /></RoleRoute>} />
        <Route path="/dashboard/settings" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSettings /></RoleRoute>} />
        <Route path="/dashboard/profile" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerProfile /></RoleRoute>} />
        <Route path="/dashboard/qr" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerQR /></RoleRoute>} />
        <Route path="/dashboard/domain" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerCustomDomain /></RoleRoute>} />
        <Route path="/dashboard/ai" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><AITools /></RoleRoute>} />
        <Route path="/dashboard/build" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CardStudio /></RoleRoute>} />
        <Route path="/dashboard/home" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerHome /></RoleRoute>} />
        <Route path="/dashboard/about" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerAbout /></RoleRoute>} />
        <Route path="/dashboard/products" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerProducts /></RoleRoute>} />
        <Route path="/dashboard/payments" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerPayments /></RoleRoute>} />
        <Route path="/dashboard/media" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerMedia /></RoleRoute>} />
        <Route path="/dashboard/social" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSocial /></RoleRoute>} />
        <Route path="/dashboard/uploads" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerUploads /></RoleRoute>} />
        {/* Enquiries merged into the Leads CRM — keep the old URL working. */}
        <Route path="/dashboard/enquiry" element={<Navigate to="/dashboard/leads" replace />} />
        <Route path="/dashboard/view" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerViewCard /></RoleRoute>} />
        {/* QR code is now part of the Payments module */}
        <Route path="/dashboard/qrcode" element={<Navigate to="/dashboard/payments" replace />} />
        {/* Offers / Deals is now the offers tab of the Products module */}
        <Route path="/dashboard/offers" element={<Navigate to="/dashboard/products?tab=offers" replace />} />
        <Route path="/dashboard/reviews" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerReviews /></RoleRoute>} />

        {/* Backward-compat: old printed cards used digitalcarda.in/<slug> (no /c/).
            Kept last so every named route above wins first. */}
        <Route path="/:slug" element={<PublicCard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}
