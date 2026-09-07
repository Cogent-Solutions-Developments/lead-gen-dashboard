import { AutocallLaunch } from "@/components/autocall/AutocallLaunch";

export const metadata = { title: "Autocall | Supernizo", referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";

export default function AutocallPage() {
  return <AutocallLaunch allowLocalHttp={process.env.NODE_ENV === "development"} baseUrl={process.env.AUTOCALL_PUBLIC_URL ?? ""} portal="light" />;
}
