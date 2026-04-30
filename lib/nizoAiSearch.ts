import type { EventSummaryItem, LeadItem } from "@/lib/api";

export type NizoSearchIntent = {
  titles: string[];
  locations: string[];
  industries: string[];
  companies: string[];
  keywords: string[];
};

export type NizoCorrection = {
  from: string;
  to: string;
  type: "title" | "location" | "industry";
  distance: number;
};

export type NizoParsedSearch = {
  intent: NizoSearchIntent;
  corrections: NizoCorrection[];
};

export type NizoScoreBreakdown = {
  label: string;
  points: number;
  detail: string;
};

export type NizoScoredLead = {
  lead: LeadItem;
  score: number;
  maxScore: number;
  relevance: number;
  reasons: string[];
  breakdown: NizoScoreBreakdown[];
  seniorityScore: number;
  reachabilityScore: number;
  freshnessScore: number;
};

export type NizoScoredEvent = {
  event: EventSummaryItem;
  score: number;
  reasons: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "based",
  "for",
  "from",
  "give",
  "in",
  "industry",
  "lead",
  "leads",
  "me",
  "of",
  "on",
  "or",
  "people",
  "person",
  "show",
  "the",
  "to",
  "with",
]);

const TITLE_TERMS = [
  "chief executive officer",
  "chief financial officer",
  "chief operating officer",
  "chief technology officer",
  "general manager",
  "managing director",
  "regional director",
  "sales director",
  "marketing director",
  "operations director",
  "business development director",
  "country manager",
  "regional manager",
  "sales manager",
  "marketing manager",
  "operations manager",
  "procurement manager",
  "project manager",
  "plant manager",
  "business development manager",
  "head of sales",
  "head of marketing",
  "head of operations",
  "head of procurement",
  "vice president",
  "founder",
  "owner",
  "partner",
  "director",
  "manager",
  "ceo",
  "cfo",
  "coo",
  "cto",
  "vp",
];

const LOCATION_TERMS = [
  "qatar",
  "doha",
  "uae",
  "united arab emirates",
  "dubai",
  "abu dhabi",
  "saudi arabia",
  "riyadh",
  "jeddah",
  "kuwait",
  "oman",
  "muscat",
  "bahrain",
  "manama",
  "gcc",
  "singapore",
  "malaysia",
  "india",
  "germany",
  "united kingdom",
  "uk",
  "london",
];

const INDUSTRY_TERMS = [
  "oil and gas",
  "energy",
  "renewable energy",
  "construction",
  "infrastructure",
  "manufacturing",
  "industrial",
  "healthcare",
  "logistics",
  "supply chain",
  "real estate",
  "finance",
  "banking",
  "technology",
  "software",
  "hospitality",
  "aviation",
  "maritime",
  "events",
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeToken(token: string) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalizePhrase(value: unknown) {
  return normalizeText(value)
    .split(" ")
    .map(singularizeToken)
    .join(" ");
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizePhrase(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function maxDistance(term: string) {
  const compact = term.replace(/\s+/g, "");
  if (compact.length <= 3) return 0;
  if (compact.length <= 5) return 1;
  if (compact.length <= 10) return 2;
  return 3;
}

function ngrams(tokens: string[], size: number) {
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    out.push(tokens.slice(i, i + size).join(" "));
  }
  return out;
}

function findDictionaryMatches(
  query: string,
  terms: string[],
  type: NizoCorrection["type"]
) {
  const normalizedQuery = normalizePhrase(query);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const matches: string[] = [];
  const corrections: NizoCorrection[] = [];

  for (const rawTerm of terms) {
    const term = normalizePhrase(rawTerm);
    if (!term) continue;

    if (normalizedQuery.includes(term)) {
      matches.push(term);
      continue;
    }

    const termSize = term.split(" ").length;
    const candidates = ngrams(tokens, termSize);
    let best: { value: string; distance: number } | null = null;

    for (const candidate of candidates) {
      const distance = levenshtein(candidate, term);
      if (!best || distance < best.distance) best = { value: candidate, distance };
    }

    if (best && best.distance > 0 && best.distance <= maxDistance(term)) {
      matches.push(term);
      corrections.push({ from: best.value, to: term, type, distance: best.distance });
    }
  }

  return { matches, corrections };
}

function mergeIntent(local: NizoSearchIntent, ai?: Partial<NizoSearchIntent> | null): NizoSearchIntent {
  return {
    titles: unique([...(ai?.titles || []), ...local.titles]),
    locations: unique([...(ai?.locations || []), ...local.locations]),
    industries: unique([...(ai?.industries || []), ...local.industries]),
    companies: unique([...(ai?.companies || []), ...local.companies]),
    keywords: unique([...(ai?.keywords || []), ...local.keywords]),
  };
}

export function parseNizoSearch(query: string, aiIntent?: Partial<NizoSearchIntent> | null): NizoParsedSearch {
  const titleMatches = findDictionaryMatches(query, TITLE_TERMS, "title");
  const locationMatches = findDictionaryMatches(query, LOCATION_TERMS, "location");
  const industryMatches = findDictionaryMatches(query, INDUSTRY_TERMS, "industry");

  const matchedWords = new Set(
    [...titleMatches.matches, ...locationMatches.matches, ...industryMatches.matches]
      .flatMap((term) => term.split(" "))
      .filter(Boolean)
  );
  const keywords = normalizePhrase(query)
    .split(" ")
    .map(singularizeToken)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !matchedWords.has(token));

  return {
    intent: mergeIntent(
      {
        titles: titleMatches.matches,
        locations: locationMatches.matches,
        industries: industryMatches.matches,
        companies: [],
        keywords,
      },
      aiIntent
    ),
    corrections: [...titleMatches.corrections, ...locationMatches.corrections, ...industryMatches.corrections],
  };
}

function haystackForLead(lead: LeadItem) {
  return normalizePhrase([
    lead.employeeName,
    lead.title,
    lead.company,
    lead.email,
    lead.phone,
    lead.linkedinUrl,
    lead.companyUrl,
    lead.eventName,
    lead.canonicalEventName,
    lead.canonicalEventKey,
  ].join(" "));
}

function haystackForEvent(event: EventSummaryItem) {
  return normalizePhrase([
    event.canonicalEventName,
    event.canonicalEventKey,
    ...(event.relatedCampaignNames || []),
  ].join(" "));
}

function fieldIncludes(value: unknown, terms: string[]) {
  const haystack = normalizePhrase(value);
  return terms.some((term) => haystack.includes(normalizePhrase(term)));
}

function matchingTerms(value: unknown, terms: string[]) {
  const haystack = normalizePhrase(value);
  return terms.filter((term) => haystack.includes(normalizePhrase(term)));
}

function expandTitleTerms(terms: string[]) {
  const aliases: Record<string, string[]> = {
    ceo: ["ceo", "chief executive officer"],
    cfo: ["cfo", "chief financial officer"],
    coo: ["coo", "chief operating officer"],
    cto: ["cto", "chief technology officer"],
    vp: ["vp", "vice president"],
  };

  return unique(terms.flatMap((term) => aliases[term] || [term]));
}

function fuzzyTokenIncluded(haystack: string, term: string) {
  const target = normalizePhrase(term);
  if (!target) return false;
  if (haystack.includes(target)) return true;

  const targetSize = target.split(" ").length;
  const tokens = haystack.split(" ").filter(Boolean);
  return ngrams(tokens, targetSize).some((candidate) => {
    const distance = levenshtein(candidate, target);
    return distance <= maxDistance(target);
  });
}

function fuzzyFieldIncludes(value: unknown, terms: string[]) {
  const haystack = normalizePhrase(value);
  return terms.some((term) => fuzzyTokenIncluded(haystack, term));
}

export function getNizoSeniorityScore(lead: LeadItem) {
  const title = normalizePhrase(lead.title);
  if (!title) return 0;
  if (/\b(ceo|cfo|coo|cto|cio|cmo|cro|ciso)\b/.test(title)) return 15;
  if (title.includes("chief ") || title.includes("founder") || title.includes("owner")) return 15;
  if (title.includes("managing director") || title.includes("president")) return 15;
  if (title.includes("vice president") || /\bvp\b/.test(title) || title.includes("director") || title.includes("head of")) return 10;
  if (title.includes("manager") || title.includes("lead")) return 5;
  return 0;
}

export function getNizoReachabilityScore(lead: LeadItem) {
  return (lead.email ? 5 : 0) + (lead.linkedinUrl ? 5 : 0);
}

export function getNizoFreshnessScore(lead: LeadItem) {
  const status = normalizePhrase(`${lead.workflowStatus || ""} ${lead.workflowStatusLabel || ""}`);
  if (!status || status.includes("new") || status.includes("not contacted") || status.includes("not contact")) return 10;
  if (status.includes("replied") || status.includes("sent") || status.includes("contacted")) return 0;
  return 5;
}

export function scoreNizoLead(lead: LeadItem, parsed: NizoParsedSearch, rawQuery: string): NizoScoredLead {
  const { intent } = parsed;
  const haystack = haystackForLead(lead);
  const reasons: string[] = [];
  const breakdown: NizoScoreBreakdown[] = [];
  let score = 0;
  const titleTerms = expandTitleTerms(intent.titles);
  const maxScore = 120;
  const addScore = (label: string, points: number, detail: string) => {
    if (points <= 0) return;
    score += points;
    reasons.push(label.toLowerCase());
    breakdown.push({ label, points, detail });
  };

  const exactTitleMatches = matchingTerms(lead.title, titleTerms);
  if (titleTerms.length && exactTitleMatches.length) {
    addScore("Title exact match", 40, exactTitleMatches.slice(0, 2).join(", "));
  } else if (titleTerms.length && fuzzyFieldIncludes(lead.title, titleTerms)) {
    addScore("Title fuzzy match", 20, "Close title match");
  }

  const eventContext = `${lead.eventName || ""} ${lead.canonicalEventName || ""} ${lead.canonicalEventKey || ""}`;
  const locationMatches = matchingTerms(eventContext, intent.locations);
  if (intent.locations.length && locationMatches.length) {
    addScore("Country match", 20, locationMatches.slice(0, 2).join(", "));
  }

  const industryContext = `${lead.company || ""} ${eventContext}`;
  const industryMatches = matchingTerms(industryContext, intent.industries);
  if (intent.industries.length && industryMatches.length) {
    addScore("Industry match", 25, industryMatches.slice(0, 2).join(", "));
  }

  if (intent.companies.length && fieldIncludes(lead.company, intent.companies)) {
    addScore("Company match", 15, intent.companies.filter((term) => fieldIncludes(lead.company, [term])).join(", "));
  }

  const seniorityScore = getNizoSeniorityScore(lead);
  if (seniorityScore) addScore("Seniority bonus", seniorityScore, lead.title || "Seniority signal");
  if (lead.linkedinUrl) addScore("Has LinkedIn", 5, "LinkedIn profile available");
  if (lead.email) addScore("Has email", 5, "Email available");
  const freshnessScore = getNizoFreshnessScore(lead);
  if (freshnessScore) addScore("Pipeline freshness", freshnessScore, lead.workflowStatusLabel || lead.workflowStatus || "No prior contact signal");

  for (const keyword of intent.keywords) {
    if (fuzzyTokenIncluded(haystack, keyword)) {
      addScore("Keyword match", 3, keyword);
    }
  }

  const rawTokens = normalizePhrase(rawQuery)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  for (const token of rawTokens) {
    if (haystack.includes(token)) addScore("Text match", 1, token);
  }

  const cappedScore = Math.min(maxScore, score);
  return {
    lead,
    score: cappedScore,
    maxScore,
    relevance: Math.round((cappedScore / maxScore) * 100),
    reasons: unique(reasons).slice(0, 5),
    breakdown,
    seniorityScore,
    reachabilityScore: getNizoReachabilityScore(lead),
    freshnessScore,
  };
}

export function searchNizoLeads(leads: LeadItem[], parsed: NizoParsedSearch, rawQuery: string) {
  const hasStructuredIntent =
    parsed.intent.titles.length ||
    parsed.intent.locations.length ||
    parsed.intent.industries.length ||
    parsed.intent.companies.length ||
    parsed.intent.keywords.length;

  if (!hasStructuredIntent && !rawQuery.trim()) return [];

  const requiredTitleTerms = expandTitleTerms(parsed.intent.titles);

  return leads
    .map((lead) => scoreNizoLead(lead, parsed, rawQuery))
    .filter((entry) => {
      if (entry.score <= 0) return false;
      if (!requiredTitleTerms.length) return true;
      return fieldIncludes(entry.lead.title, requiredTitleTerms) || fuzzyFieldIncludes(entry.lead.title, requiredTitleTerms);
    })
    .sort((a, b) => b.score - a.score);
}

export type NizoSortMode = "best_match" | "easiest" | "seniority" | "freshest";

export function sortNizoScoredLeads(leads: NizoScoredLead[], mode: NizoSortMode) {
  return [...leads].sort((a, b) => {
    if (mode === "easiest") {
      const reachDiff = b.reachabilityScore - a.reachabilityScore;
      if (reachDiff) return reachDiff;
    }
    if (mode === "seniority") {
      const seniorityDiff = b.seniorityScore - a.seniorityScore;
      if (seniorityDiff) return seniorityDiff;
    }
    if (mode === "freshest") {
      const freshnessDiff = b.freshnessScore - a.freshnessScore;
      if (freshnessDiff) return freshnessDiff;
    }
    return b.score - a.score;
  });
}

function tokenSet(value: unknown) {
  return new Set(normalizePhrase(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function overlapScore(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.max(a.size, b.size);
}

export function findSimilarNizoLeads(target: NizoScoredLead, leads: NizoScoredLead[], limit = 4) {
  const targetTitle = tokenSet(target.lead.title);
  const targetCompany = tokenSet(target.lead.company);
  const targetEvent = tokenSet(`${target.lead.eventName || ""} ${target.lead.canonicalEventName || ""} ${target.lead.canonicalEventKey || ""}`);

  return leads
    .filter((entry) => entry.lead.id !== target.lead.id)
    .map((entry) => {
      const title = overlapScore(targetTitle, tokenSet(entry.lead.title)) * 45;
      const company = overlapScore(targetCompany, tokenSet(entry.lead.company)) * 15;
      const event = overlapScore(targetEvent, tokenSet(`${entry.lead.eventName || ""} ${entry.lead.canonicalEventName || ""} ${entry.lead.canonicalEventKey || ""}`)) * 25;
      const seniority = Math.max(0, 15 - Math.abs(target.seniorityScore - entry.seniorityScore));
      return { entry, similarity: Math.round(title + company + event + seniority) };
    })
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function scoreNizoEvent(
  event: EventSummaryItem,
  parsed: NizoParsedSearch,
  rawQuery: string
): NizoScoredEvent {
  const { intent } = parsed;
  const haystack = haystackForEvent(event);
  const reasons: string[] = [];
  let score = 0;

  for (const location of intent.locations) {
    if (fuzzyTokenIncluded(haystack, location)) {
      score += 70;
      reasons.push(`event/location: ${location}`);
    }
  }

  for (const industry of intent.industries) {
    if (fuzzyTokenIncluded(haystack, industry)) {
      score += 35;
      reasons.push(`event/industry: ${industry}`);
    }
  }

  for (const keyword of intent.keywords) {
    if (fuzzyTokenIncluded(haystack, keyword)) {
      score += 8;
      reasons.push(`event: ${keyword}`);
    }
  }

  const rawTokens = normalizePhrase(rawQuery)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  for (const token of rawTokens) {
    if (haystack.includes(token)) score += 2;
  }

  return { event, score, reasons: unique(reasons).slice(0, 4) };
}

export function searchNizoEvents(events: EventSummaryItem[], parsed: NizoParsedSearch, rawQuery: string) {
  const needsLocationMatch = parsed.intent.locations.length > 0;

  return events
    .map((event) => scoreNizoEvent(event, parsed, rawQuery))
    .filter((entry) => {
      if (entry.score <= 0) return false;
      if (!needsLocationMatch) return true;
      return entry.reasons.some((reason) => reason.startsWith("event/location:"));
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.event.leadCount || 0) - Number(a.event.leadCount || 0);
    });
}
