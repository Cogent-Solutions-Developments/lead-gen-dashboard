"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MyLeadUpdateRequest } from "@/lib/apiRouter";

export type EditableMyLead = {
  id: string;
  employeeName: string;
  title: string;
  company: string;
  companyUrl: string;
  email: string;
  phone: string;
  phones: string[];
  linkedinUrl: string;
  category: string;
  leadEditVersion: number;
};

type EditValues = Omit<EditableMyLead, "id" | "leadEditVersion" | "phones"> & {
  phone2: string;
};

type MyLeadEditFormProps = {
  lead: EditableMyLead;
  requireContact: boolean;
  onCancel: () => void;
  onSubmit: (payload: MyLeadUpdateRequest) => Promise<void>;
};

const EDIT_FIELDS = [
  "employeeName",
  "title",
  "company",
  "companyUrl",
  "email",
  "phone",
  "phone2",
  "linkedinUrl",
  "category",
] as const;

function valuesFromLead(lead: EditableMyLead): EditValues {
  return {
    employeeName: lead.employeeName,
    title: lead.title,
    company: lead.company,
    companyUrl: lead.companyUrl,
    email: lead.email,
    phone: lead.phone,
    phone2: lead.phones[1] || "",
    linkedinUrl: lead.linkedinUrl,
    category: lead.category,
  };
}

function cleanValues(values: EditValues): EditValues {
  return Object.fromEntries(
    EDIT_FIELDS.map((field) => [field, values[field].trim()])
  ) as EditValues;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "We could not save this lead. Refresh and try again.";
}

function normalizePhoneKey(value: string) {
  const text = value.trim();
  const normalized = [...text]
    .filter((character, index) => /\d/.test(character) || (character === "+" && index === 0))
    .join("");
  return normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized || text;
}

export function MyLeadEditForm({
  lead,
  requireContact,
  onCancel,
  onSubmit,
}: MyLeadEditFormProps) {
  const fieldId = useId();
  const [values, setValues] = useState<EditValues>(() => valuesFromLead(lead));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const leadPhone2 = lead.phones[1] || "";

  useEffect(() => {
    setValues({
      employeeName: lead.employeeName,
      title: lead.title,
      company: lead.company,
      companyUrl: lead.companyUrl,
      email: lead.email,
      phone: lead.phone,
      phone2: leadPhone2,
      linkedinUrl: lead.linkedinUrl,
      category: lead.category,
    });
    setError("");
  }, [
    lead.category,
    lead.company,
    lead.companyUrl,
    lead.email,
    lead.employeeName,
    lead.id,
    lead.leadEditVersion,
    lead.linkedinUrl,
    lead.phone,
    leadPhone2,
    lead.title,
  ]);

  const updateField = (field: keyof EditValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const cleaned = cleanValues(values);
  const original = cleanValues(valuesFromLead(lead));
  const hasChanges = EDIT_FIELDS.some((field) => cleaned[field] !== original[field]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cleaned.employeeName) {
      setError("Full name is required.");
      return;
    }
    if (!cleaned.category) {
      setError("Category is required.");
      return;
    }
    if (requireContact && !cleaned.email && !cleaned.phone && !cleaned.phone2) {
      setError("Sales leads need an email address or phone number.");
      return;
    }
    if (
      cleaned.phone &&
      cleaned.phone2 &&
      normalizePhoneKey(cleaned.phone) === normalizePhoneKey(cleaned.phone2)
    ) {
      setError("Mobile numbers 1 and 2 must be different.");
      return;
    }

    const payload: MyLeadUpdateRequest = { expectedVersion: lead.leadEditVersion };
    if (cleaned.employeeName !== original.employeeName) payload.fullName = cleaned.employeeName;
    if (cleaned.title !== original.title) payload.title = cleaned.title;
    if (cleaned.company !== original.company) payload.companyName = cleaned.company;
    if (cleaned.companyUrl !== original.companyUrl) payload.companyUrl = cleaned.companyUrl;
    if (cleaned.email !== original.email) payload.email = cleaned.email;
    if (cleaned.phone !== original.phone) payload.phone = cleaned.phone;
    if (cleaned.phone2 !== original.phone2) payload.phone2 = cleaned.phone2;
    if (cleaned.linkedinUrl !== original.linkedinUrl) payload.linkedinUrl = cleaned.linkedinUrl;
    if (cleaned.category !== original.category) payload.category = cleaned.category;

    if (!hasChanges) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(payload);
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-11 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-sm font-light text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-blue-600 focus-visible:ring-0";
  const labelClass = "mb-1.5 block text-xs font-medium text-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={saving}>
      <p className="text-sm font-light leading-6 text-zinc-500">
        Update this uploaded lead&apos;s profile. Deletion is intentionally unavailable.
      </p>

      <fieldset disabled={saving} className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldId}-name`} className={labelClass}>Full name *</label>
          <Input id={`${fieldId}-name`} value={values.employeeName} onChange={(event) => updateField("employeeName", event.target.value)} maxLength={255} autoComplete="name" className={inputClass} required />
        </div>
        <div>
          <label htmlFor={`${fieldId}-category`} className={labelClass}>Category *</label>
          <Input id={`${fieldId}-category`} value={values.category} onChange={(event) => updateField("category", event.target.value)} maxLength={255} className={inputClass} required />
        </div>
        <div>
          <label htmlFor={`${fieldId}-title`} className={labelClass}>Job title</label>
          <Input id={`${fieldId}-title`} value={values.title} onChange={(event) => updateField("title", event.target.value)} maxLength={255} autoComplete="organization-title" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${fieldId}-company`} className={labelClass}>Company</label>
          <Input id={`${fieldId}-company`} value={values.company} onChange={(event) => updateField("company", event.target.value)} maxLength={500} autoComplete="organization" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${fieldId}-email`} className={labelClass}>Email</label>
          <Input id={`${fieldId}-email`} type="email" value={values.email} onChange={(event) => updateField("email", event.target.value)} maxLength={255} autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${fieldId}-phone`} className={labelClass}>Mobile number 1</label>
          <Input id={`${fieldId}-phone`} type="tel" value={values.phone} onChange={(event) => updateField("phone", event.target.value)} maxLength={80} autoComplete="tel" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${fieldId}-phone-2`} className={labelClass}>Mobile number 2</label>
          <Input id={`${fieldId}-phone-2`} type="tel" value={values.phone2} onChange={(event) => updateField("phone2", event.target.value)} maxLength={80} autoComplete="off" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${fieldId}-website`} className={labelClass}>Company website</label>
          <Input id={`${fieldId}-website`} value={values.companyUrl} onChange={(event) => updateField("companyUrl", event.target.value)} maxLength={2048} inputMode="url" autoComplete="url" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${fieldId}-linkedin`} className={labelClass}>LinkedIn URL</label>
          <Input id={`${fieldId}-linkedin`} value={values.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} maxLength={2048} inputMode="url" autoComplete="url" className={inputClass} />
        </div>
      </fieldset>

      {error ? (
        <div role="alert" className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-zinc-200 pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="rounded-none px-0 text-zinc-500 hover:bg-transparent hover:text-zinc-950">
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !hasChanges} className="h-11 min-w-36 rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
