const MANIFESTOS = [
  "We believe in you. You are smart, capable, and full of potential otherwise you would not be here. Now it is your responsibility to prove yourself right.",
  "At Cogent, we do not hire average people. We hire people capable of building extraordinary futures through discipline and hard work.",
  "You are far more capable than you think. The only question is whether you are willing to push hard enough to discover it.",
  "One day your future life will thank you for the sacrifices, pressure, and discipline you embraced today.",
  "You were chosen for a reason. Someone saw intelligence, hunger, and greatness inside you. Now it is time to unlock it.",
  "The people who become exceptional are usually the people willing to keep going after everyone else slows down.",
  "At Cogent, we care deeply about your growth because your success story is part of our success story.",
  "You are capable of achieving a life most people only dream about — but only if your work ethic matches your ambition.",
  "We believe your future can become extraordinary. But extraordinary lives are built through ordinary discipline repeated every day.",
  "Your current effort is building your future freedom. Never underestimate how much one year of hard work can change your life.",
  "You do not need to be perfect. You simply need to stay committed longer than most people are willing to.",
  "There is a reason you are sitting in this room. You have talent. You have intelligence. You have potential. Now build the discipline to match it.",
  "At Cogent, we are not only building careers. We are building stronger, smarter, more successful versions of ourselves.",
  "The strongest people are not the most talented — they are the ones who refuse to stop growing.",
  "If you push yourself now, your future family will benefit from sacrifices they may never even see.",
  "You are capable of far more responsibility, success, leadership, and greatness than you currently realize.",
  "The market rewards people who become impossible to ignore through consistency, discipline, and hunger.",
  "At Cogent, your growth matters. We want you to succeed financially, professionally, and personally — but you must meet opportunity with effort.",
  "The difference between average and extraordinary is often one extra hour, one extra call, one extra level of discipline repeated over time.",
  "Never forget this: you were not hired by accident. You are here because we believe you can become something exceptional.",
];

/**
 * Returns a personalized deterministic manifesto based on the date and user ID.
 * This ensures different users see different quotes on the same day.
 */
export function getDailyManifesto(userId: string): string {
  if (!userId) return MANIFESTOS[0];
  
  const now = new Date();
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  
  // Create a numeric seed from the userId string
  const userSeed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const index = (dateSeed + userSeed) % MANIFESTOS.length;
  return MANIFESTOS[index];
}
