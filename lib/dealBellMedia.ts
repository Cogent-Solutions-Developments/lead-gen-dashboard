export type DealBellMedia = {
  src: string;
  label: string;
  width: number;
  height: number;
};

export const DEAL_BELL_MEDIA: DealBellMedia[] = [
  { src: "/videos/asnnha.gif", label: "Deal bell celebration 1", width: 360, height: 148 },
  { src: "/videos/asnnn7.gif", label: "Deal bell celebration 2", width: 360, height: 205 },
  { src: "/videos/asnnt5.gif", label: "Deal bell celebration 3", width: 360, height: 202 },
  { src: "/videos/asnob7.gif", label: "Deal bell celebration 5", width: 360, height: 201 },
  { src: "/videos/asnp1v.gif", label: "Deal bell celebration 8", width: 360, height: 202 },
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousLocalDate(date: Date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mediaIndexForSeed(seed: string, dateKey: string) {
  return hashString(`${seed}:${dateKey}`) % DEAL_BELL_MEDIA.length;
}

export function getDailyDealBellMedia(userSeed: string | null | undefined, date = new Date()) {
  const seed = userSeed?.trim().toLowerCase() || "anonymous";
  const todayKey = localDateKey(date);
  const yesterdayKey = localDateKey(previousLocalDate(date));
  const todayIndex = mediaIndexForSeed(seed, todayKey);
  const yesterdayIndex = mediaIndexForSeed(seed, yesterdayKey);
  const index = todayIndex === yesterdayIndex ? (todayIndex + 1) % DEAL_BELL_MEDIA.length : todayIndex;

  return DEAL_BELL_MEDIA[index] ?? DEAL_BELL_MEDIA[0];
}
