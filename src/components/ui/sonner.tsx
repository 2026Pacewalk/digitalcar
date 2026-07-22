import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      expand
      offset={76}
      gap={10}
      duration={4000}
      icons={{
        success: <CircleCheckIcon className="size-[18px]" />,
        info: <InfoIcon className="size-[18px]" />,
        warning: <TriangleAlertIcon className="size-[18px]" />,
        error: <OctagonXIcon className="size-[18px]" />,
        loading: <Loader2Icon className="size-[18px] animate-spin" />,
      }}
      toastOptions={{
        style: {
          borderRadius: "14px",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: 500,
          boxShadow: "0 10px 30px -8px rgba(15,23,42,0.25)",
          minHeight: "56px",
        },
      }}
      style={
        {
          "--width": "380px",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "14px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
