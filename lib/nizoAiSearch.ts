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

function tokenize(value: unknown) {
  return normalizePhrase(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function charNgrams(value: string, size = 3) {
  const compact = normalizePhrase(value).replace(/\s+/g, "");
  if (!compact) return [];
  if (compact.length <= size) return [compact];
  const out: string[] = [];
  for (let i = 0; i <= compact.length - size; i++) out.push(compact.slice(i, i + size));
  return out;
}

function jaccardSimilarity(a: string[], b: string[]) {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const item of left) {
    if (right.has(item)) overlap += 1;
  }
  return overlap / (left.size + right.size - overlap);
}

function jaroSimilarity(a: string, b: string) {
  const left = normalizePhrase(a).replace(/\s+/g, "");
  const right = normalizePhrase(b).replace(/\s+/g, "");
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = Array(left.length).fill(false);
  const rightMatches = Array(right.length).fill(false);
  let matches = 0;

  for (let i = 0; i < left.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, right.length);
    for (let j = start; j < end; j++) {
      if (rightMatches[j] || left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (!matches) return 0;

  const leftMatched: string[] = [];
  const rightMatched: string[] = [];
  for (let i = 0; i < left.length; i++) {
    if (leftMatches[i]) leftMatched.push(left[i]);
  }
  for (let i = 0; i < right.length; i++) {
    if (rightMatches[i]) rightMatched.push(right[i]);
  }

  let transpositions = 0;
  for (let i = 0; i < leftMatched.length; i++) {
    if (leftMatched[i] !== rightMatched[i]) transpositions += 1;
  }

  return (
    matches / left.length +
    matches / right.length +
    (matches - transpositions / 2) / matches
  ) / 3;
}

function jaroWinklerSimilarity(a: string, b: string) {
  const jaro = jaroSimilarity(a, b);
  const left = normalizePhrase(a).replace(/\s+/g, "");
  const right = normalizePhrase(b).replace(/\s+/g, "");
  let prefix = 0;
  for (let i = 0; i < Math.min(4, left.length, right.length); i++) {
    if (left[i] !== right[i]) break;
    prefix += 1;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function soundex(value: string) {
  const normalized = normalizePhrase(value).replace(/[^a-z]/g, "").toUpperCase();
  if (!normalized) return "";
  const first = normalized[0];
  const codes: Record<string, string> = {
    B: "1",
    F: "1",
    P: "1",
    V: "1",
    C: "2",
    G: "2",
    J: "2",
    K: "2",
    Q: "2",
    S: "2",
    X: "2",
    Z: "2",
    D: "3",
    T: "3",
    L: "4",
    M: "5",
    N: "5",
    R: "6",
  };
  const encoded = normalized
    .slice(1)
    .split("")
    .map((char) => codes[char] || "0")
    .filter((code, index, list) => code !== "0" && code !== list[index - 1])
    .join("");
  return `${first}${encoded}000`.slice(0, 4);
}

function tokenSimilarity(a: string, b: string) {
  const left = normalizePhrase(a);
  const right = normalizePhrase(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) >= 3 ? 0.92 : 0.82;

  const distance = levenshtein(left, right);
  const levenshteinSimilarity = 1 - distance / Math.max(left.length, right.length);
  const winkler = jaroWinklerSimilarity(left, right);
  const trigram = jaccardSimilarity(charNgrams(left), charNgrams(right));
  const phonetic = soundex(left) && soundex(left) === soundex(right) ? 0.86 : 0;

  return Math.max(levenshteinSimilarity, winkler, trigram, phonetic);
}

function fieldSimilarity(value: unknown, term: string) {
  const haystack = normalizePhrase(value);
  const target = normalizePhrase(term);
  if (!haystack || !target) return 0;
  if (haystack.includes(target)) return 1;

  const targetSize = target.split(" ").length;
  const tokens = haystack.split(" ").filter(Boolean);
  const phraseCandidates = ngrams(tokens, targetSize);
  const phraseSimilarity = phraseCandidates.reduce(
    (best, candidate) => Math.max(best, tokenSimilarity(candidate, target)),
    0
  );

  if (targetSize === 1) {
    const tokenMatch = tokens.reduce((best, token) => Math.max(best, tokenSimilarity(token, target)), 0);
    return Math.max(phraseSimilarity, tokenMatch);
  }

  return phraseSimilarity;
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

    const closeMatch = best ? fieldSimilarity(best.value, term) >= 0.88 : false;
    if (best && best.distance > 0 && (best.distance <= maxDistance(term) || closeMatch)) {
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

type NizoFieldName = "title" | "company" | "event" | "contact" | "all";

type NizoCorpusStats = {
  docCount: number;
  avgLengthByField: Record<NizoFieldName, number>;
  docFreqByField: Record<NizoFieldName, Map<string, number>>;
};

type NizoLeadIndex = {
  byToken: Map<string, Set<string>>;
  byTrigram: Map<string, Set<string>>;
  bySoundex: Map<string, Set<string>>;
  byId: Map<string, LeadItem>;
};

function fieldValueForLead(lead: LeadItem, field: NizoFieldName) {
  if (field === "title") return lead.title;
  if (field === "company") return lead.company;
  if (field === "event") return `${lead.eventName || ""} ${lead.canonicalEventName || ""} ${lead.canonicalEventKey || ""}`;
  if (field === "contact") return `${lead.employeeName || ""} ${lead.email || ""} ${lead.phone || ""} ${lead.linkedinUrl || ""} ${lead.companyUrl || ""}`;
  return haystackForLead(lead);
}

function queryTerms(parsed: NizoParsedSearch, rawQuery: string) {
  return unique([
    ...parsed.intent.titles,
    ...parsed.intent.locations,
    ...parsed.intent.industries,
    ...parsed.intent.companies,
    ...parsed.intent.keywords,
    ...tokenize(rawQuery),
  ]);
}

function buildCorpusStats(leads: LeadItem[]): NizoCorpusStats {
  const fields: NizoFieldName[] = ["title", "company", "event", "contact", "all"];
  const docFreqByField = Object.fromEntries(fields.map((field) => [field, new Map<string, number>()])) as Record<
    NizoFieldName,
    Map<string, number>
  >;
  const totalLengthByField = Object.fromEntries(fields.map((field) => [field, 0])) as Record<NizoFieldName, number>;

  for (const lead of leads) {
    for (const field of fields) {
      const tokens = tokenize(fieldValueForLead(lead, field));
      totalLengthByField[field] += tokens.length;
      for (const token of new Set(tokens)) {
        docFreqByField[field].set(token, (docFreqByField[field].get(token) || 0) + 1);
      }
    }
  }

  return {
    docCount: Math.max(1, leads.length),
    avgLengthByField: Object.fromEntries(
      fields.map((field) => [field, Math.max(1, totalLengthByField[field] / Math.max(1, leads.length))])
    ) as Record<NizoFieldName, number>,
    docFreqByField,
  };
}

function bm25ScoreField(tokens: string[], terms: string[], stats: NizoCorpusStats, field: NizoFieldName) {
  if (!tokens.length || !terms.length) return 0;
  const k1 = 1.2;
  const b = 0.75;
  const termFreq = new Map<string, number>();
  for (const token of tokens) termFreq.set(token, (termFreq.get(token) || 0) + 1);

  let score = 0;
  for (const term of terms.flatMap(tokenize)) {
    const matchingToken = tokens.find((token) => token === term) || tokens.find((token) => tokenSimilarity(token, term) >= 0.92);
    if (!matchingToken) continue;

    const tf = termFreq.get(matchingToken) || 0;
    const df = stats.docFreqByField[field].get(matchingToken) || 0;
    const idf = Math.log(1 + (stats.docCount - df + 0.5) / (df + 0.5));
    const denom = tf + k1 * (1 - b + b * (tokens.length / stats.avgLengthByField[field]));
    score += idf * ((tf * (k1 + 1)) / denom);
  }
  return score;
}

function weightedBm25Score(lead: LeadItem, terms: string[], stats?: NizoCorpusStats) {
  if (!stats || !terms.length) return 0;
  const title = bm25ScoreField(tokenize(fieldValueForLead(lead, "title")), terms, stats, "title") * 3;
  const event = bm25ScoreField(tokenize(fieldValueForLead(lead, "event")), terms, stats, "event") * 1.8;
  const company = bm25ScoreField(tokenize(fieldValueForLead(lead, "company")), terms, stats, "company") * 1.4;
  const contact = bm25ScoreField(tokenize(fieldValueForLead(lead, "contact")), terms, stats, "contact") * 0.8;
  const all = bm25ScoreField(tokenize(fieldValueForLead(lead, "all")), terms, stats, "all") * 0.6;
  return Math.min(35, Math.round((title + event + company + contact + all) * 5));
}

function addPosting(index: Map<string, Set<string>>, key: string, leadId: string) {
  if (!key) return;
  const current = index.get(key);
  if (current) {
    current.add(leadId);
  } else {
    index.set(key, new Set([leadId]));
  }
}

function createNizoLeadIndex(leads: LeadItem[]): NizoLeadIndex {
  const index: NizoLeadIndex = {
    byToken: new Map(),
    byTrigram: new Map(),
    bySoundex: new Map(),
    byId: new Map(),
  };

  for (const lead of leads) {
    index.byId.set(lead.id, lead);
    const tokens = tokenize(haystackForLead(lead));
    for (const token of new Set(tokens)) {
      addPosting(index.byToken, token, lead.id);
      addPosting(index.bySoundex, soundex(token), lead.id);
      for (const gram of charNgrams(token)) addPosting(index.byTrigram, gram, lead.id);
    }
  }

  return index;
}

function candidateIdsFromIndex(index: NizoLeadIndex, terms: string[]) {
  const candidateIds = new Set<string>();
  for (const term of terms.flatMap(tokenize)) {
    const tokenMatches = index.byToken.get(term);
    if (tokenMatches) for (const id of tokenMatches) candidateIds.add(id);

    const phoneticMatches = index.bySoundex.get(soundex(term));
    if (phoneticMatches) for (const id of phoneticMatches) candidateIds.add(id);

    const grams = charNgrams(term);
    const trigramCounts = new Map<string, number>();
    for (const gram of grams) {
      const matches = index.byTrigram.get(gram);
      if (!matches) continue;
      for (const id of matches) trigramCounts.set(id, (trigramCounts.get(id) || 0) + 1);
    }
    const needed = Math.max(1, Math.ceil(grams.length * 0.55));
    for (const [id, count] of trigramCounts) {
      if (count >= needed) candidateIds.add(id);
    }
  }
  return candidateIds;
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
  return ngrams(tokens, targetSize).some((candidate) => fieldSimilarity(candidate, target) >= 0.86);
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

export function scoreNizoLead(
  lead: LeadItem,
  parsed: NizoParsedSearch,
  rawQuery: string,
  stats?: NizoCorpusStats
): NizoScoredLead {
  const { intent } = parsed;
  const haystack = haystackForLead(lead);
  const reasons: string[] = [];
  const breakdown: NizoScoreBreakdown[] = [];
  let score = 0;
  const titleTerms = expandTitleTerms(intent.titles);
  const relevanceTerms = queryTerms(parsed, rawQuery);
  const maxScore = 120;
  const addScore = (label: string, points: number, detail: string) => {
    if (points <= 0) return;
    score += points;
    reasons.push(label.toLowerCase());
    breakdown.push({ label, points, detail });
  };

  const bm25Points = weightedBm25Score(lead, relevanceTerms, stats);
  if (bm25Points) addScore("BM25 relevance", bm25Points, relevanceTerms.slice(0, 4).join(", "));

  const exactTitleMatches = matchingTerms(lead.title, titleTerms);
  if (titleTerms.length && exactTitleMatches.length) {
    addScore("Title exact match", 40, exactTitleMatches.slice(0, 2).join(", "));
  } else if (titleTerms.length) {
    const bestTitleMatch = titleTerms.reduce((best, term) => Math.max(best, fieldSimilarity(lead.title, term)), 0);
    if (bestTitleMatch >= 0.9) {
      addScore("Title fuzzy match", 28, "Jaro-Winkler / phonetic title match");
    } else if (bestTitleMatch >= 0.82) {
      addScore("Title fuzzy match", 20, "Close title match");
    }
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
    const similarity = fieldSimilarity(haystack, keyword);
    if (similarity >= 0.86) {
      addScore("Keyword match", similarity >= 0.94 ? 5 : 3, keyword);
    }
  }

  const rawTokens = normalizePhrase(rawQuery)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  for (const token of rawTokens) {
    const similarity = fieldSimilarity(haystack, token);
    if (similarity >= 0.9) addScore("Text match", similarity >= 0.98 ? 2 : 1, token);
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
  const stats = buildCorpusStats(leads);
  const index = createNizoLeadIndex(leads);
  const indexedCandidateIds = candidateIdsFromIndex(index, queryTerms(parsed, rawQuery));
  const candidates = indexedCandidateIds.size
    ? leads.filter((lead) => indexedCandidateIds.has(lead.id))
    : leads;

  return candidates
    .map((lead) => scoreNizoLead(lead, parsed, rawQuery, stats))
    .filter((entry) => {
      if (entry.score <= 0) return false;
      if (!requiredTitleTerms.length) return true;
      return fieldIncludes(entry.lead.title, requiredTitleTerms) || requiredTitleTerms.some((term) => fieldSimilarity(entry.lead.title, term) >= 0.82);
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
      const freshnessDiff = a.freshnessScore - b.freshnessScore;
      if (freshnessDiff) return freshnessDiff;
    }
    return b.score - a.score;
  });
}

function tokenSet(value: unknown) {
  return new Set(normalizePhrase(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function leadVector(entry: NizoScoredLead) {
  const vector = new Map<string, number>();
  const add = (key: string, weight: number) => {
    if (!key) return;
    vector.set(key, (vector.get(key) || 0) + weight);
  };

  for (const token of tokenSet(entry.lead.title)) add(`title:${token}`, 3);
  for (const token of tokenSet(entry.lead.company)) add(`company:${token}`, 1.5);
  for (const token of tokenSet(`${entry.lead.eventName || ""} ${entry.lead.canonicalEventName || ""} ${entry.lead.canonicalEventKey || ""}`)) {
    add(`event:${token}`, 2);
  }
  add(`seniority:${Math.round(entry.seniorityScore / 5)}`, 1);
  add(`reachable:${Math.round(entry.reachabilityScore / 5)}`, 0.7);
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of a.values()) leftMagnitude += value * value;
  for (const value of b.values()) rightMagnitude += value * value;
  for (const [key, value] of a) {
    dot += value * (b.get(key) || 0);
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function findSimilarNizoLeads(target: NizoScoredLead, leads: NizoScoredLead[], limit = 4) {
  const targetVector = leadVector(target);

  return leads
    .filter((entry) => entry.lead.id !== target.lead.id)
    .map((entry) => {
      const similarity = cosineSimilarity(targetVector, leadVector(entry));
      return { entry, similarity: Math.round(similarity * 100) };
    })
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

type TrieNode = {
  children: Map<string, TrieNode>;
  values: Set<string>;
};

function createTrieNode(): TrieNode {
  return { children: new Map(), values: new Set() };
}

function insertTrieValue(root: TrieNode, value: string) {
  const normalized = normalizePhrase(value);
  if (!normalized) return;
  let node = root;
  for (const char of normalized) {
    const next = node.children.get(char) || createTrieNode();
    node.children.set(char, next);
    node = next;
  }
  node.values.add(value);
}

function collectTrieValues(node: TrieNode, output: Set<string>, limit: number) {
  for (const value of node.values) {
    output.add(value);
    if (output.size >= limit) return;
  }
  for (const child of node.children.values()) {
    collectTrieValues(child, output, limit);
    if (output.size >= limit) return;
  }
}

export function suggestNizoSearchTerms(
  query: string,
  options?: {
    recent?: string[];
    leads?: LeadItem[];
    events?: EventSummaryItem[];
    limit?: number;
  }
) {
  const limit = options?.limit || 6;
  const normalized = normalizePhrase(query);
  const lastTerm = normalized.split(/\s+/).filter(Boolean).at(-1) || normalized;
  if (lastTerm.length < 2) return [];

  const root = createTrieNode();
  const values = [
    ...TITLE_TERMS,
    ...LOCATION_TERMS,
    ...INDUSTRY_TERMS,
    ...(options?.recent || []),
    ...(options?.leads || []).flatMap((lead) => [lead.employeeName, lead.title, lead.company].map((value) => String(value || ""))),
    ...(options?.events || []).flatMap((event) =>
      [event.canonicalEventName, event.canonicalEventKey, ...(event.relatedCampaignNames || [])].map((value) => String(value || ""))
    ),
  ];

  for (const value of unique(values)) insertTrieValue(root, value);

  let node: TrieNode | undefined = root;
  for (const char of lastTerm) {
    node = node.children.get(char);
    if (!node) break;
  }

  const suggestions = new Set<string>();
  if (node) collectTrieValues(node, suggestions, limit);

  if (suggestions.size < limit) {
    for (const value of unique(values)) {
      if (fieldSimilarity(value, lastTerm) >= 0.86) suggestions.add(value);
      if (suggestions.size >= limit) break;
    }
  }

  return Array.from(suggestions).slice(0, limit);
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
