import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { buildCardHtml } from "@/card-template/buildCard";
import { demoForProduct } from "@/lib/demoData";
import { logFunnel } from "@/lib/funnel";

/* Live Demo — renders a full, interactive card using clearly-fictional sample
   data matched to the product's profession. Never shows a real customer. */
export default function CardDemo() {
  const { slug = "" } = useParams();
  const { data: product, isLoading } = trpc.product.bySlug.useQuery({ slug }, { enabled: !!slug });

  const html = useMemo(() => {
    if (!product) return "";
    const { customer, products } = demoForProduct(product);
    const rec = {
      ...customer,
      slug: "demo",
      theme: product.styleNumber,
      color: product.primaryColor || "#F7B31C",
      color2: product.secondaryColor || "",
    } as Parameters<typeof buildCardHtml>[0];
    return buildCardHtml(rec, products, [], [], [], [], []);
  }, [product]);

  useEffect(() => {
    if (product) { document.title = `Live Demo — ${product.name} | DigitalCarda`; logFunnel("demo_view", product.slug); }
  }, [product]);

  if (isLoading) return <div className="pt-28 text-center text-[#64748B]">Loading demo…</div>;
  if (!product || product.status !== "published") return (
    <div className="pt-32 pb-24 text-center px-4">
      <p className="text-lg font-bold text-[#0F172A]">Demo not available</p>
      <Link to="/digital-business-cards-templates" className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-xl gradient-gold text-[#0F172A] font-bold">Browse cards <ArrowRight size={16} /></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] pt-16">
      {/* Demo banner — makes it unmistakable this is sample data */}
      <div className="sticky top-16 z-30 bg-[#0F172A]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to={`/digital-business-cards-templates/${product.slug}`} className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 shrink-0"><ArrowLeft size={16} /></Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F7B31C] flex items-center gap-1"><Sparkles size={11} /> Live Demo · Sample data</p>
              <p className="text-sm font-semibold text-white truncate">{product.name}</p>
            </div>
          </div>
          <Link to={`/signup?product=${encodeURIComponent(product.slug)}`} className="shrink-0 h-10 px-4 sm:px-5 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold flex items-center gap-2 hover:shadow-gold transition-all">
            <span className="hidden sm:inline">Try This Card Free</span><span className="sm:hidden">Try Free</span> <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Phone frame with the live card */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-[390px] bg-white rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-[#1E293B]" style={{ height: "min(78vh, 780px)" }}>
          <iframe srcDoc={html} title={`${product.name} demo`} className="w-full h-full border-0 bg-white" />
        </div>
        <p className="text-[12px] text-[#64748B] mt-4 text-center max-w-md">This is a live demo with fictional sample data. Every button works — try tapping Call, WhatsApp or Save Contact. Start free to build your own with real details.</p>
      </div>
    </div>
  );
}
