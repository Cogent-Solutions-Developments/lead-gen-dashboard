import { redirect } from "next/navigation";

export default function LegacyUserActivityPage() {
  redirect("/admin/user-performance#activity");
}
