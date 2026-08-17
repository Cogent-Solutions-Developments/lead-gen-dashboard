import { apiClient } from "@/lib/apiClient";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EventSubmissionType = "registration" | "sponsorship";
export type EventMatchStatus = "matched" | "unmatched" | "ambiguous";

export type EventSubmissionContact = {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  mobileNumber: string | null;
  workEmail: string | null;
  country: string | null;
};

export type EventSubmission = {
  id: string;
  event: {
    eventId: string | null;
    eventKey: string | null;
    eventName: string;
    registryEventName: string | null;
    matchStatus: EventMatchStatus;
  };
  submissionType: EventSubmissionType;
  contact: EventSubmissionContact;
  category: JsonValue[] | null;
  interested: JsonValue[] | null;
  schemaVersion: string;
  sourceSystem: string;
  sourceRecordId: string | null;
  submittedAt: string;
  receivedAt: string;
  formData?: Record<string, JsonValue>;
};

export type EventSubmissionCluster = {
  label: string;
  value: JsonValue;
  filterValue: string;
  count: number;
};

export type EventSubmissionOverview = {
  metrics: {
    total: number;
    registrations: number;
    sponsorships: number;
    events: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
  };
  eventClusters: Array<{
    eventName: string;
    count: number;
    registrations: number;
    sponsorships: number;
    latestSubmittedAt: string | null;
  }>;
  categoryClusters: EventSubmissionCluster[];
  sponsorClusters: EventSubmissionCluster[];
};

export type EventSubmissionFilters = {
  eventName?: string;
  submissionType?: EventSubmissionType;
  category?: string;
  interested?: string;
  categoryValue?: string;
  interestedValue?: string;
  matchStatus?: EventMatchStatus;
  search?: string;
  submittedFrom?: string;
  submittedTo?: string;
};

export type EventSubmissionListParams = EventSubmissionFilters & {
  sortBy?: "submittedAt" | "receivedAt" | "eventName" | "contactName" | "company";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type EventSubmissionListResponse = {
  items: EventSubmission[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

function compactParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function fetchEventSubmissionOverview(
  filters: EventSubmissionFilters = {},
  signal?: AbortSignal
) {
  const response = await apiClient.get<{
    overview: EventSubmissionOverview;
    generatedAt: string;
  }>("/api/manager/event-submissions/overview", {
    params: compactParams({ ...filters, clusterLimit: 100 }),
    signal,
  });
  return response.data;
}

export async function fetchEventSubmissions(
  params: EventSubmissionListParams = {},
  signal?: AbortSignal
) {
  const response = await apiClient.get<EventSubmissionListResponse>(
    "/api/manager/event-submissions",
    {
      params: compactParams(params),
      signal,
    }
  );
  return response.data;
}

export async function fetchEventSubmission(submissionId: string, signal?: AbortSignal) {
  const response = await apiClient.get<{ submission: EventSubmission }>(
    `/api/manager/event-submissions/${encodeURIComponent(submissionId)}`,
    { signal }
  );
  return response.data.submission;
}
