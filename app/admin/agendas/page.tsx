import { redirect } from "next/navigation";

export default function LegacyAgendaLibraryPage() {
  redirect("/admin/event-documents");
}
