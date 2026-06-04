"use client"

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
      expand
      gap={10}
      visibleToasts={4}
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={2.35} />,
        info: <InfoIcon className="size-4" strokeWidth={2.35} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={2.35} />,
        error: <OctagonXIcon className="size-4" strokeWidth={2.35} />,
        loading: <Loader2Icon className="size-4 animate-spin" strokeWidth={2.35} />,
      }}
      toastOptions={{
        duration: 7000,
        classNames: {
          toast: "supernizo-toast",
          content: "supernizo-toast-content",
          title: "supernizo-toast-title",
          description: "supernizo-toast-description",
          icon: "supernizo-toast-icon",
          closeButton: "supernizo-toast-close",
          success: "supernizo-toast-success",
          info: "supernizo-toast-info",
          warning: "supernizo-toast-warning",
          error: "supernizo-toast-error",
          loading: "supernizo-toast-loading",
        },
      }}
      style={
        {
          "--width": "21.5rem",
          "--normal-bg": "rgb(255 255 255)",
          "--normal-text": "rgb(15 23 42)",
          "--normal-border": "rgb(226 232 240)",
          "--border-radius": "0.875rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
