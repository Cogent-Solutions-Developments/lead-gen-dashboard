import type { AxiosInstance } from "axios";
import { getStoredAuthSession } from "@/lib/auth";

export type PreviewInput = {
  platform: "email" | "whatsapp";
  feedback?: string;
  parentJobId?: string;
  previousContent?: { email_subject?: string; email_body?: string; whatsapp_message?: string };
  signal?: AbortSignal;
};
type PreviewJob<T> = {
  jobId: string; requestId?: string; state: string; platform: string;
  result?: T | null; message: string; canContinue: boolean; budgetExhausted: boolean;
};
const pending = new Map<string, string>();

function sleep(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("Preview disconnected")); return; }
    const abort = () => { clearTimeout(timer); reject(new Error("Preview disconnected")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 1500);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function generateDurablePreview<T>(client: AxiosInstance, path: string, input: PreviewInput): Promise<T> {
  const { signal, ...body } = input;
  const actor = getStoredAuthSession()?.user.id;
  if (!actor) throw new Error("Please sign in to generate a preview.");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
  const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
  const key = `content-preview:v1:${actor}:${path}:${hash}`;
  let requestId = pending.get(key);
  try { requestId = requestId || localStorage.getItem(key) || undefined; } catch { /* Storage is optional. */ }
  const options = { timeout: 30000, signal };
  const checkSession = () => { if (signal?.aborted || getStoredAuthSession()?.user.id !== actor) throw new Error("Preview disconnected"); };
  checkSession();
  let job = (await client.get<PreviewJob<T> | null>(`${path}/latest?platform=${body.platform}`, options)).data;
  checkSession();
  const matching = !!requestId && job?.requestId === requestId;
  const restoring = !body.feedback && !body.parentJobId && !body.previousContent && job?.platform === body.platform;
  if (job && (matching || restoring)) {
    if (job.canContinue) job = (await client.post<PreviewJob<T>>(`${path}/${job.jobId}/continue`, {}, options)).data;
  } else {
    requestId = requestId || crypto.randomUUID();
    pending.set(key, requestId);
    try { localStorage.setItem(key, requestId); } catch { /* Storage is optional. */ }
    job = (await client.post<PreviewJob<T>>(path, { ...body, requestId }, options)).data;
  }
  const deadline = Date.now() + 10 * 60 * 1000;
  while (job) {
    if (signal?.aborted || getStoredAuthSession()?.user.id !== actor) throw new Error("Preview disconnected");
    if (job.state === "SUCCESS" && job.result) {
      pending.delete(key);
      try { localStorage.removeItem(key); } catch { /* Storage is optional. */ }
      return job.result;
    }
    if (["FAILURE", "PAUSED", "CANCELLED"].includes(job.state)) {
      throw new Error(job.budgetExhausted
        ? "This preview reached its allowance. Ask an administrator to resolve its budget; your previous content is safe."
        : `${job.message} ${job.canContinue ? "Select Generate or Regenerate again to continue the saved request." : ""}`);
    }
    if (Date.now() > deadline) throw new Error("Your preview is still running. Select Generate again to reconnect; it will not start over.");
    await sleep(signal);
    job = (await client.get<PreviewJob<T>>(`${path}/${job.jobId}`, options)).data;
  }
  throw new Error("Preview is not available.");
}
