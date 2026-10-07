import { Suspense } from "react";
import MarketingWorkspace from "@/components/marketing/MarketingWorkspace";

export default function MarketingPage() {
  return (
    <Suspense fallback={<p role="status">Loading Marketing…</p>}>
      <MarketingWorkspace />
    </Suspense>
  );
}
