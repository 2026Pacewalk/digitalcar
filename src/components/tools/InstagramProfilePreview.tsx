/* An Instagram profile header, drawn so the bio reads exactly as it will on a
   phone: display name, category, the bio lines, then the link. Shared by the
   dashboard tool and the public free tool so the two never look different. */
import { Link2, ChevronDown, Grid3x3 } from "lucide-react";

export default function InstagramProfilePreview({ username, displayName, category, bio, link, avatar }: {
  username: string; displayName: string; category: string; bio: string; link: string; avatar?: string;
}) {
  const initial = (displayName || username || "D").trim().charAt(0).toUpperCase();
  const shownLink = link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return (
    <div className="overflow-hidden rounded-[28px] border-[7px] border-[#0B1120] bg-white shadow-[0_30px_60px_-30px_rgba(2,6,23,0.55)]">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="flex min-w-0 items-center gap-1 text-[15px] font-bold text-[#0F172A]">
          <span className="truncate">{username || "yourbusiness"}</span>
          <ChevronDown size={15} className="shrink-0" />
        </span>
        <span className="text-[18px] leading-none text-[#0F172A]" aria-hidden="true">≡</span>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-4">
          {/* Story ring in Instagram's gradient */}
          <span className="shrink-0 rounded-full bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7] p-[2.5px]">
            <span className="block rounded-full bg-white p-[2px]">
              {avatar
                ? <img src={avatar} alt="" className="h-[68px] w-[68px] rounded-full object-contain bg-white" />
                : <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#F7B31C] text-2xl font-bold text-[#0F172A]">{initial}</span>}
            </span>
          </span>
          <div className="grid flex-1 grid-cols-3 text-center" aria-hidden="true">
            {["posts", "followers", "following"].map((l) => (
              <span key={l}>
                <span className="block h-3.5 mx-auto w-7 rounded bg-[#E2E8F0]" />
                <span className="mt-1 block text-[11px] text-[#475569]">{l}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2.5 text-[13px] leading-[1.35]">
          <p className="font-semibold text-[#0F172A]">{displayName || "Your Name"}</p>
          {category && <p className="text-[#737373]">{category}</p>}
          <p className="whitespace-pre-wrap break-words text-[#0F172A]">{bio}</p>
          {shownLink && (
            <p className="mt-0.5 flex items-center gap-1 font-semibold text-[#00376B]">
              <Link2 size={13} className="shrink-0 -rotate-45" /> <span className="truncate">{shownLink}</span>
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 pb-3">
          <span className="rounded-lg bg-[#0095F6] py-1.5 text-center text-[12.5px] font-semibold text-white">Follow</span>
          <span className="rounded-lg bg-[#EFEFEF] py-1.5 text-center text-[12.5px] font-semibold text-[#0F172A]">Message</span>
          <span className="rounded-lg bg-[#EFEFEF] py-1.5 text-center text-[12.5px] font-semibold text-[#0F172A]">Contact</span>
        </div>
      </div>

      <div className="flex justify-center border-t border-[#EFEFEF] py-2" aria-hidden="true">
        <Grid3x3 size={18} className="text-[#0F172A]" />
      </div>
      <div className="grid grid-cols-3 gap-[2px]" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="aspect-square" style={{ background: ["#FDE68A", "#FBCFE8", "#BFDBFE", "#BBF7D0", "#DDD6FE", "#FED7AA"][i] }} />
        ))}
      </div>
    </div>
  );
}
