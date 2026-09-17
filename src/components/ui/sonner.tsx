import { useEffect, useState } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/* App-wide notifications.

   Placement: bottom-right on desktop (1024px+) — out of the way of what you're working on
   (they used to drop in top-centre, over headings and the template list). On
   phones and tablets they sit at the top under the header, because the bottom of
   the screen belongs to the tab bar and the floating Call / WhatsApp buttons.

   Look: a calm white card with a small tinted icon for the type, instead of a
   solid green/red block with a close button. One at a time stays readable, so
   at most three stack and they collapse into a pile. */

function useIsPhone() {
  // Below lg the site and dashboards show a bottom tab bar, so notifications go on top.
  const query = "(max-width: 1023px)"
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setPhone(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return phone
}

const chip = "flex size-8 shrink-0 items-center justify-center rounded-full"

const Toaster = ({ ...props }: ToasterProps) => {
  const phone = useIsPhone()

  return (
    <Sonner
      theme="light"
      className="toaster group"
      position={phone ? "top-center" : "bottom-right"}
      offset={phone ? 72 : 24}
      mobileOffset={{ top: 72, left: 12, right: 12 }}
      visibleToasts={3}
      gap={8}
      duration={3200}
      icons={{
        success: <span className={`${chip} bg-emerald-50 text-emerald-600`}><CircleCheckIcon className="size-[17px]" /></span>,
        info: <span className={`${chip} bg-sky-50 text-sky-600`}><InfoIcon className="size-[17px]" /></span>,
        warning: <span className={`${chip} bg-amber-50 text-amber-600`}><TriangleAlertIcon className="size-[17px]" /></span>,
        error: <span className={`${chip} bg-red-50 text-red-600`}><OctagonXIcon className="size-[17px]" /></span>,
        loading: <span className={`${chip} bg-slate-100 text-slate-500`}><Loader2Icon className="size-[17px] animate-spin" /></span>,
      }}
      toastOptions={{
        classNames: {
          toast: "!items-center !gap-3 !rounded-2xl !border !border-[#E8ECF3] !bg-white !px-3.5 !py-3 !text-[#0F172A] !shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-14px_rgba(15,23,42,0.28)]",
          icon: "!m-0 !size-8",
          title: "!text-[13.5px] !font-semibold !leading-snug",
          description: "!mt-0.5 !text-[12px] !leading-snug !text-[#64748B]",
          actionButton: "!rounded-lg !bg-[#0F172A] !text-white !text-[12px] !font-semibold",
          cancelButton: "!rounded-lg !bg-[#F1F5F9] !text-[#334155] !text-[12px]",
        },
      }}
      style={{ "--width": "360px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
