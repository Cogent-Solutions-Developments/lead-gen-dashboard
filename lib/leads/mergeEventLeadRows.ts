import type {
  LeadDepartmentTag,
  LeadOriginHistoryItem,
  LeadOriginSource,
  LeadOwnerSummary,
} from "@/lib/apiRouter";

type MergeableEventLead = {
  id: string;
  mergedLeadIds: string[];
  canonicalEventKey: string;
  leadIdentityKey: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
  category: string;
  isManualLead: boolean;
  manualLeadAddedByUsername: string;
  primaryDepartment: string;
  departments: string[];
  departmentTags: LeadDepartmentTag[];
  owners: LeadOwnerSummary[];
  originSources: LeadOriginSource[];
  originHistory: LeadOriginHistoryItem[];
  ownershipCount: number;
  isSuppressed: boolean;
  contactReadOnly: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIdentityText(value: unknown) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeEmail(value: unknown) {
  return text(value).toLocaleLowerCase().replace(/^mailto:/, "").trim();
}

function normalizePhone(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

function normalizeProfileUrl(value: unknown) {
  return text(value)
    .toLocaleLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

function isSameLeadWithinEvent<T extends MergeableEventLead>(left: T, right: T) {
  if (left.canonicalEventKey !== right.canonicalEventKey) return false;
  if (left.leadIdentityKey === right.leadIdentityKey) return true;

  const leftName = normalizeIdentityText(left.employeeName);
  const rightName = normalizeIdentityText(right.employeeName);
  const hasMatchingName = Boolean(leftName && leftName === rightName);
  const leftEmail = normalizeEmail(left.email);
  const rightEmail = normalizeEmail(right.email);
  if (hasMatchingName && leftEmail && leftEmail === rightEmail) return true;

  const leftLinkedin = normalizeProfileUrl(left.linkedinUrl);
  const rightLinkedin = normalizeProfileUrl(right.linkedinUrl);
  if (leftLinkedin && leftLinkedin === rightLinkedin) return true;

  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (hasMatchingName && leftPhone && leftPhone === rightPhone) return true;

  if ((leftEmail || leftLinkedin || leftPhone) && (rightEmail || rightLinkedin || rightPhone)) return false;

  return Boolean(
    hasMatchingName
      && normalizeIdentityText(left.company)
      && normalizeIdentityText(left.company) === normalizeIdentityText(right.company)
      && normalizeIdentityText(left.title)
      && normalizeIdentityText(left.title) === normalizeIdentityText(right.title)
  );
}

function firstText<T>(rows: T[], select: (row: T) => string) {
  for (const row of rows) {
    const value = select(row).trim();
    if (value) return value;
  }
  return "";
}

function mergeStrings(values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const label = value.trim();
    if (label) unique.set(label.toLocaleLowerCase(), label);
  }
  return [...unique.values()];
}

function mergeGroup<T extends MergeableEventLead>(rows: T[]): T {
  const primary = rows[0];
  if (rows.length === 1) return primary;

  const departmentTags = new Map<string, LeadDepartmentTag>();
  const owners = new Map<string, LeadOwnerSummary>();
  const originSources = new Map<string, LeadOriginSource>();
  const contactsById = new Map(rows.map((row) => [row.id, row]));

  for (const row of rows) {
    for (const item of row.departmentTags) {
      const key = text(item.department).toLocaleLowerCase();
      if (key && !departmentTags.has(key)) departmentTags.set(key, item);
    }
    for (const item of row.owners) {
      const label = text(item.label || item.ownerFirstName || item.ownerDisplayName);
      const key = text(item.ownerUserId || `${item.ownerType}:${label}`).toLocaleLowerCase();
      if (key && label && !owners.has(key)) owners.set(key, item);
    }
    for (const item of row.originSources) {
      const key = [
        text(item.sourceType),
        text(item.ownerUserId || item.ownerUsername || item.ownerDisplayName || item.label),
        text(item.department),
      ].map((value) => value.toLocaleLowerCase()).join("|");
      const existing = originSources.get(key);
      if (!existing) {
        originSources.set(key, item);
        continue;
      }
      const existingTimestamp = Date.parse(text(existing.firstOwnedAt));
      const nextTimestamp = Date.parse(text(item.firstOwnedAt));
      originSources.set(key, {
        ...existing,
        firstOwnedAt: Number.isFinite(nextTimestamp) && (!Number.isFinite(existingTimestamp) || nextTimestamp < existingTimestamp)
          ? item.firstOwnedAt
          : existing.firstOwnedAt,
        occurrenceCount: Math.max(Number(existing.occurrenceCount || 0), Number(item.occurrenceCount || 0)) || null,
      });
    }
  }

  const historyByKey = new Map<string, LeadOriginHistoryItem>();
  for (const row of rows) {
    for (const item of row.originHistory) {
      const sourceContact = item.personId ? contactsById.get(item.personId) : undefined;
      const key = [
        text(item.personId),
        text(item.icpRunId),
        text(item.sourceType),
        text(item.ownerUserId || item.ownerUsername || item.ownerDisplayName || item.ownerLabel),
        text(item.department),
        text(item.occurredAt) || `sequence:${item.sequence}`,
      ].map((value) => value.toLocaleLowerCase()).join("|");
      const enriched = {
        ...item,
        sourceEmail: sourceContact?.email || item.sourceEmail || null,
        sourcePhone: sourceContact?.phone || item.sourcePhone || null,
        sourceLinkedinUrl: sourceContact?.linkedinUrl || item.sourceLinkedinUrl || null,
        sourceCompanyUrl: sourceContact?.companyUrl || item.sourceCompanyUrl || null,
      };
      const existing = historyByKey.get(key);
      historyByKey.set(key, existing ? {
        ...existing,
        sourceEmail: existing.sourceEmail || enriched.sourceEmail,
        sourcePhone: existing.sourcePhone || enriched.sourcePhone,
        sourceLinkedinUrl: existing.sourceLinkedinUrl || enriched.sourceLinkedinUrl,
        sourceCompanyUrl: existing.sourceCompanyUrl || enriched.sourceCompanyUrl,
      } : enriched);
    }
  }

  const originHistory = [...historyByKey.values()]
    .sort((left, right) => {
      const leftTime = Date.parse(text(left.occurredAt));
      const rightTime = Date.parse(text(right.occurredAt));
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) return Number.isFinite(leftTime) ? -1 : 1;
      return Number(left.sequence || 0) - Number(right.sequence || 0);
    })
    .map((item, index) => ({ ...item, sequence: index + 1, isFirst: index === 0 }));

  return {
    ...primary,
    mergedLeadIds: mergeStrings(rows.flatMap((row) => row.mergedLeadIds)),
    employeeName: firstText(rows, (row) => row.employeeName),
    title: firstText(rows, (row) => row.title),
    company: firstText(rows, (row) => row.company),
    email: firstText(rows, (row) => row.email),
    phone: firstText(rows, (row) => row.phone),
    linkedinUrl: firstText(rows, (row) => row.linkedinUrl),
    companyUrl: firstText(rows, (row) => row.companyUrl),
    category: firstText(rows, (row) => row.category),
    isManualLead: rows.some((row) => row.isManualLead),
    manualLeadAddedByUsername: firstText(rows, (row) => row.manualLeadAddedByUsername),
    primaryDepartment: firstText(rows, (row) => row.primaryDepartment),
    departments: mergeStrings(rows.flatMap((row) => row.departments)),
    departmentTags: [...departmentTags.values()],
    owners: [...owners.values()],
    originSources: [...originSources.values()],
    originHistory,
    ownershipCount: Math.max(originHistory.length, ...rows.map((row) => row.ownershipCount)),
    isSuppressed: rows.some((row) => row.isSuppressed),
    contactReadOnly: rows.some((row) => row.contactReadOnly),
  };
}

export function mergeDuplicateEventLeadRows<T extends MergeableEventLead>(rows: T[]) {
  if (rows.length < 2) return rows;

  const parents = rows.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };

  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      if (isSameLeadWithinEvent(rows[left], rows[right])) union(left, right);
    }
  }

  const groups = new Map<number, T[]>();
  for (let index = 0; index < rows.length; index += 1) {
    const root = find(index);
    const group = groups.get(root);
    if (group) group.push(rows[index]);
    else groups.set(root, [rows[index]]);
  }
  return [...groups.values()].map(mergeGroup);
}
