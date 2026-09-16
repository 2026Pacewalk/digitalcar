/* An article's picture: its feature image when one has been added, otherwise
   the generated cover art. Fills its (sized) container either way.

   `priority` is the large picture at the top of an article or the featured
   card. There the cover art is served as a real image file
   (/og/blog/<slug>-16x9.jpg, the same one in the article's structured data),
   so Google Images can index it — an inline SVG can't be. Everywhere else the
   inline SVG draws instantly with no extra download. The dev server has no
   image route, so it always uses the SVG. */
import BlogCover, { coverDescription } from "./BlogCover";
import { BLOG_ART_SIZES, blogArtPath, type BlogPost } from "@/data/blog";

export default function PostVisual({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  if (post.image) {
    return (
      <img
        src={post.image.src}
        alt={post.image.alt}
        width={post.image.width}
        height={post.image.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="block h-full w-full object-cover"
      />
    );
  }
  if (priority && !import.meta.env.DEV) {
    const { width, height } = BLOG_ART_SIZES["16x9"];
    return (
      <img
        src={blogArtPath(post, "16x9")}
        alt={coverDescription(post.cover)}
        width={width}
        height={height}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        // The illustration sits on the right of the cover, so wider crops keep that side.
        className="block h-full w-full bg-[#0F172A] object-cover object-right"
      />
    );
  }
  return <BlogCover cover={post.cover} />;
}
