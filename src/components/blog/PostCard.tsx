/* An article teaser, used on the blog page and under each article. */
import { Link } from "react-router";
import { ArrowUpRight, Clock } from "lucide-react";
import BlogCover from "./BlogCover";
import { blogPostPath, categoryLabel, formatBlogDate, readingMinutes, type BlogPost } from "@/data/blog";

export default function PostCard({ post, headingLevel = "h3" }: { post: BlogPost; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-[#E9EDF3] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] hover:ring-[#F7B31C]/60">
      <div className="relative aspect-[16/9] overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
          <BlogCover cover={post.cover} />
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F172A] shadow-sm backdrop-blur">
          {categoryLabel(post.category)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading className="font-display text-[1.2rem] font-extrabold leading-snug tracking-tight text-[#0F172A] [text-wrap:balance]">
          {/* The whole card is the link target (the ::after overlay), but only
              the title is announced as the link text. */}
          <Link to={blogPostPath(post.slug)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-[#F7B31C]">
            {post.title}
          </Link>
        </Heading>
        <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-[#64748B]">{post.excerpt}</p>
        <div className="mt-auto flex items-center justify-between pt-5 text-[12.5px] text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5"><Clock size={13} aria-hidden="true" /> {readingMinutes(post)} min read · {formatBlogDate(post.updatedAt)}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8FAFC] text-[#0F172A] transition-colors group-hover:bg-[#F7B31C]" aria-hidden="true">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
