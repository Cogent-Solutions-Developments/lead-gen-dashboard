import type { OutreachMessage } from "./automatedOutreach";

export type OutreachContentState = "complete" | "processing" | "failed" | "pending";

export function outreachContentStates(messages: OutreachMessage[]): OutreachContentState[] {
  return [1, 2, 3].map((step) => {
    const message = messages.find((item) => item.step === step);
    if (!message) return "pending";
    if (["preview_queued", "preview_generating", "generating"].includes(message.status)) return "processing";
    // Delivery failures do not invalidate already generated content.
    if (message.subject?.trim() && message.body?.trim()) return "complete";
    if (["preview_failed", "failed"].includes(message.status)) return "failed";
    return "pending";
  });
}
