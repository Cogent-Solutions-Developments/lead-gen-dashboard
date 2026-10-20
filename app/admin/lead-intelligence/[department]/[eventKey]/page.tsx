import { notFound } from "next/navigation";
import { OutreachLeadTable } from "@/components/automated-outreach/OutreachLeadTable";
import { OUTREACH_DEPARTMENTS, type OutreachDepartment } from "@/lib/automatedOutreach";

export default async function EventLeadsPage({ params }: { params: Promise<{ department: string; eventKey: string }> }) {
  const { department, eventKey } = await params;
  if (!OUTREACH_DEPARTMENTS.some((item) => item.key === department)) notFound();
  return <OutreachLeadTable department={department as OutreachDepartment} eventKey={eventKey} />;
}
