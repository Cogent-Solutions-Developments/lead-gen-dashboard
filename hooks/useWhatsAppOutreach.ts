"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

// Fail closed during initial loading or network failures. Polling and focus
// refresh also remove controls from already-open screens after deactivation.
export function useWhatsAppOutreach() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const { data } = await apiClient.get<{ enabled: boolean }>("/api/admin/settings/outreach/whatsapp/status", { timeout: 10000 });
        if (!disposed && request === sequence) setEnabled(data.enabled === true);
      } catch {
        if (!disposed && request === sequence) setEnabled(false);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("whatsapp-configuration-changed", refresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("whatsapp-configuration-changed", refresh);
    };
  }, []);
  return enabled;
}
