import { notFound } from "next/navigation";
import { OutreachEvents } from "@/components/automated-outreach/OutreachEvents";
import { OUTREACH_DEPARTMENTS, type OutreachDepartment } from "@/lib/automatedOutreach";

export default async function DepartmentPage({ params }: { params: Promise<{ department: string }> }) {
  const { department } = await params;
  if (!OUTREACH_DEPARTMENTS.some((item) => item.key === department)) notFound();
  return <OutreachEvents department={department as OutreachDepartment} />;
}
