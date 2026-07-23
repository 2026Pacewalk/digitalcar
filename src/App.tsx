import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import PublicLayout from "@/components/layout/PublicLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/public/Home";
import Features from "./pages/public/Features";
import Templates from "./pages/public/Templates";
import Industries from "./pages/public/Industries";
import Pricing from "./pages/public/Pricing";
import BulkCards from "./pages/public/BulkCards";
import AIGenerator from "./pages/public/AIGenerator";
import Resellers from "./pages/public/Resellers";
import ReferEarnPublic from "./pages/public/ReferEarn";
import CustomDomain from "./pages/public/CustomDomain";
import Contact from "./pages/public/Contact";
import Privacy from "./pages/public/Privacy";
import RefundPolicy from "./pages/public/RefundPolicy";
import TermsOfService from "./pages/public/TermsOfService";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminResellers from "./pages/admin/Resellers";
import AdminCustomers from "./pages/admin/Customers";
import AdminPackages from "./pages/admin/Packages";
import AdminTemplates from "./pages/admin/Templates";
import AdminMigration from "./pages/admin/Migration";
import AdminCards from "./pages/admin/Cards";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminLeads from "./pages/admin/Leads";
import AdminReferrals from "./pages/admin/Referrals";
import AdminPayments from "./pages/admin/Payments";
import AdminSettings from "./pages/admin/Settings";
import AdminProfile from "./pages/admin/Profile";
import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerCustomers from "./pages/reseller/Customers";
import ResellerProfile from "./pages/reseller/Profile";
import CustomerDashboard from "./pages/customer/Dashboard";
import CardBuilder from "./pages/customer/CardBuilder";
import CustomerTemplates from "./pages/customer/Templates";
import CustomerCards from "./pages/customer/Cards";
import CustomerBulkCreate from "./pages/customer/BulkCreate";
import CustomerAnalytics from "./pages/customer/Analytics";
import CustomerLeads from "./pages/customer/Leads";
import CustomerSubscription from "./pages/customer/Subscription";
import CustomerSettings from "./pages/customer/Settings";
import CustomerProfile from "./pages/customer/Profile";
import CustomerQR from "./pages/customer/QR";
import AITools from "./pages/customer/AITools";
import CustomerHome from "./pages/customer/Home";
import CustomerAbout from "./pages/customer/About";
import CustomerProducts from "./pages/customer/Products";
import CustomerPayments from "./pages/customer/Payments";
import CustomerMedia from "./pages/customer/Media";
import CustomerSocial from "./pages/customer/Social";
import CustomerUploads from "./pages/customer/Uploads";
import CustomerEnquiry from "./pages/customer/Enquiry";
import CustomerViewCard from "./pages/customer/ViewCard";
import CustomerReviews from "./pages/customer/Reviews";
import CustomerReferEarn from "./pages/customer/ReferEarn";
import PublicCard from "./pages/PublicCard";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import EnquiryToaster from "@/components/EnquiryToaster";

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-8 h-8 border-2 border-[#F7B31C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    if (user.role === "super_admin") return <Navigate to="/admin" replace />;
    if (user.role === "reseller") return <Navigate to="/reseller" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <EnquiryToaster />
      <Routes>
        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/templates" element={<Templates />} />
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

        {/* Public card */}
        <Route path="/c/:slug" element={<PublicCard />} />

        {/* Admin */}
        <Route path="/admin" element={<RoleRoute allowedRoles={["super_admin"]}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/users" element={<RoleRoute allowedRoles={["super_admin"]}><AdminUsers /></RoleRoute>} />
        <Route path="/admin/resellers" element={<RoleRoute allowedRoles={["super_admin"]}><AdminResellers /></RoleRoute>} />
        <Route path="/admin/customers" element={<RoleRoute allowedRoles={["super_admin"]}><AdminCustomers /></RoleRoute>} />
        <Route path="/admin/packages" element={<RoleRoute allowedRoles={["super_admin"]}><AdminPackages /></RoleRoute>} />
        <Route path="/admin/templates" element={<RoleRoute allowedRoles={["super_admin"]}><AdminTemplates /></RoleRoute>} />
        <Route path="/admin/migration" element={<RoleRoute allowedRoles={["super_admin"]}><AdminMigration /></RoleRoute>} />
        <Route path="/admin/cards" element={<RoleRoute allowedRoles={["super_admin"]}><AdminCards /></RoleRoute>} />
        <Route path="/admin/analytics" element={<RoleRoute allowedRoles={["super_admin"]}><AdminAnalytics /></RoleRoute>} />
        <Route path="/admin/leads" element={<RoleRoute allowedRoles={["super_admin"]}><AdminLeads /></RoleRoute>} />
        <Route path="/admin/referrals" element={<RoleRoute allowedRoles={["super_admin"]}><AdminReferrals /></RoleRoute>} />
        <Route path="/admin/payments" element={<RoleRoute allowedRoles={["super_admin"]}><AdminPayments /></RoleRoute>} />
        <Route path="/admin/settings" element={<RoleRoute allowedRoles={["super_admin"]}><AdminSettings /></RoleRoute>} />
        <Route path="/admin/profile" element={<RoleRoute allowedRoles={["super_admin"]}><AdminProfile /></RoleRoute>} />

        {/* Reseller */}
        <Route path="/reseller" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerDashboard /></RoleRoute>} />
        <Route path="/reseller/customers" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerCustomers /></RoleRoute>} />
        <Route path="/reseller/profile" element={<RoleRoute allowedRoles={["super_admin","reseller"]}><ResellerProfile /></RoleRoute>} />

        {/* Customer */}
        <Route path="/dashboard" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerDashboard /></RoleRoute>} />
        <Route path="/dashboard/builder" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CardBuilder /></RoleRoute>} />
        <Route path="/dashboard/builder/:cardId" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CardBuilder /></RoleRoute>} />
        <Route path="/dashboard/templates" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerTemplates /></RoleRoute>} />
        <Route path="/dashboard/cards" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerCards /></RoleRoute>} />
        <Route path="/dashboard/bulk" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerBulkCreate /></RoleRoute>} />
        <Route path="/dashboard/refer" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerReferEarn /></RoleRoute>} />
        <Route path="/dashboard/analytics" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerAnalytics /></RoleRoute>} />
        <Route path="/dashboard/leads" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerLeads /></RoleRoute>} />
        <Route path="/dashboard/subscription" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSubscription /></RoleRoute>} />
        <Route path="/dashboard/settings" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSettings /></RoleRoute>} />
        <Route path="/dashboard/profile" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerProfile /></RoleRoute>} />
        <Route path="/dashboard/qr" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerQR /></RoleRoute>} />
        <Route path="/dashboard/ai" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><AITools /></RoleRoute>} />
        <Route path="/dashboard/home" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerHome /></RoleRoute>} />
        <Route path="/dashboard/about" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerAbout /></RoleRoute>} />
        <Route path="/dashboard/products" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerProducts /></RoleRoute>} />
        <Route path="/dashboard/payments" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerPayments /></RoleRoute>} />
        <Route path="/dashboard/media" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerMedia /></RoleRoute>} />
        <Route path="/dashboard/social" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerSocial /></RoleRoute>} />
        <Route path="/dashboard/uploads" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerUploads /></RoleRoute>} />
        <Route path="/dashboard/enquiry" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerEnquiry /></RoleRoute>} />
        <Route path="/dashboard/view" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerViewCard /></RoleRoute>} />
        {/* QR code is now part of the Payments module */}
        <Route path="/dashboard/qrcode" element={<Navigate to="/dashboard/payments" replace />} />
        {/* Offers / Deals is now the offers tab of the Products module */}
        <Route path="/dashboard/offers" element={<Navigate to="/dashboard/products?tab=offers" replace />} />
        <Route path="/dashboard/reviews" element={<RoleRoute allowedRoles={["super_admin","reseller","customer"]}><CustomerReviews /></RoleRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
