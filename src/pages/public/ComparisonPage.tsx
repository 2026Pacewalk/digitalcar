/**
 * /vs/:slug — head-to-head comparison against a named competitor. Captures
 * high-intent commercial searches like "DigitalCarda vs Linktree" and pulls in
 * traffic from "<competitor> alternative India" as a topical relevance signal.
 */
import { Link, useParams, Navigate } from "react-router";
import { getComparison } from "@/data/comparisons";
import JsonLd from "@/components/seo/JsonLd";
import { ArrowRight } from "lucide-react";

const SIGNUP = "/signup?promo=FREE30D";

export default function ComparisonPage() {
  const { slug = "" } = useParams();
  const cmp = getComparison(slug);
  if (!cmp) return <Navigate to="/digital-business-card-guide" replace />;

  const url = `https://digitalcarda.in/vs/${cmp.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://digitalcarda.in/" },
          { "@type": "ListItem", position: 2, name: `DigitalCarda vs ${cmp.competitor}`, item: url },
        ],
      },
      {
        "@type": "Article",
        headline: `DigitalCarda vs ${cmp.competitor}: Which is Better for Indian Businesses?`,
        datePublished: "2026-09-20",
        author: { "@type": "Organization", name: "DigitalCarda" },
        publisher: {
          "@type": "Organization",
          name: "DigitalCarda",
          logo: { "@type": "ImageObject", url: "https://digitalcarda.in/apple-touch-icon.png" },
        },
        mainEntityOfPage: url,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-[#64748B]">
        <Link to="/" className="hover:text-[#0F172A]">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-[#0F172A]">DigitalCarda vs {cmp.competitor}</span>
      </nav>

      <h1 className="mt-5 font-display text-[2rem] font-extrabold leading-[1.1] text-[#0F172A] sm:text-[2.6rem]">
        DigitalCarda vs {cmp.competitor}: Which is Better for Indian Businesses?
      </h1>

      <div className="mt-5 rounded-xl bg-white/70 ring-1 ring-[#E2E8F0] px-4 py-3 text-[15px] leading-relaxed text-[#334155]">
        <strong className="text-[#0F172A]">Quick answer:</strong> {cmp.quickAnswer}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[#0F172A]">Feature comparison</h2>
        <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-[#E2E8F0]">
          <table className="min-w-full text-[14px]">
            <thead className="bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold"></th>
                <th className="px-4 py-3 text-left font-semibold">DigitalCarda</th>
                <th className="px-4 py-3 text-left font-semibold">{cmp.competitor}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {cmp.rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-4 py-3 font-medium text-[#334155]">{r.label}</td>
                  <td className="px-4 py-3 text-[#0F172A]">{r.ours}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-[#0F172A]">Which one is right for you?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#FFFBEB] ring-1 ring-[#FEF3C7] p-4">
            <h3 className="font-bold text-[#0F172A]">Choose DigitalCarda if</h3>
            <p className="mt-2 text-[14.5px] text-[#475569]">{cmp.usDescription}</p>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#0F172A]">Choose {cmp.competitor} if</h3>
            <p className="mt-2 text-[14.5px] text-[#475569]">{cmp.themDescription}</p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-[#0F172A] p-6 text-white sm:p-8">
        <h2 className="text-2xl font-bold">Try DigitalCarda free for 30 days</h2>
        <p className="mt-2 text-white/80">No card details needed. Move your card over in 2 minutes.</p>
        <Link to={SIGNUP} className="mt-5 btn-gold h-12 px-6 inline-flex items-center justify-center gap-2">
          Start free trial <ArrowRight size={16} />
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#0F172A]">Other comparisons</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
          {["linktree", "hihello", "beaconstac"].filter((s) => s !== cmp.slug).map((s) => {
            const other = getComparison(s);
            return other ? (
              <li key={s}>
                <Link to={`/vs/${s}`} className="text-[#0F172A] underline decoration-[#F7B31C] underline-offset-4 hover:text-[#F7B31C]">DigitalCarda vs {other.competitor}</Link>
              </li>
            ) : null;
          })}
        </ul>
      </section>
    </main>
  );
}
