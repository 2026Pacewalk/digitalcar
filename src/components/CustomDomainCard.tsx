import { trpc } from "@/providers/trpc";
import PublicCard from "@/pages/PublicCard";
import { RefreshCw } from "lucide-react";

/* Rendered when the app is loaded on a customer/reseller custom domain
   (e.g. card.acme.com). Resolves host → published card slug, then renders the
   normal public card. Routing is short-circuited: a custom domain only ever
   shows its one card. */
export default function CustomDomainCard({ host }: { host: string }) {
  const { data, isLoading } = trpc.domain.resolve.useQuery({ host }, { retry: false });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <RefreshCw size={22} className="animate-spin text-[#94A3B8]" />
      </div>
    );
  }
  if (data?.slug) return <PublicCard slugOverride={data.slug} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={26} className="text-[#94A3B8]" />
        </div>
        <h1 className="text-xl font-semibold text-[#0F172A]">Card not linked yet</h1>
        <p className="text-sm text-[#94A3B8] mt-1.5">This domain isn&apos;t connected to a published card, or the connection is still being verified. Please check back shortly.</p>
        <a href="https://digitalcarda.in" className="inline-block mt-5 text-[13px] font-semibold text-[#D97706] hover:underline">Powered by DigitalCarda</a>
      </div>
    </div>
  );
}
