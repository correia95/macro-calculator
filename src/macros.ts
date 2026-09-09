// Macronutrient split engine. Pure, dependency-free.
// Formulae are published references (Mifflin-St Jeor BMR, Atwater 4/4/9 kcal/g).
// This is an estimate, not medical or dietary advice.

export type Sex = 'male' | 'female';
export type UnitSystem = 'metric' | 'imperial';

export const KCAL = { protein: 4, carb: 4, fat: 9 };

export const ACTIVITY: { id: string; label: string; factor: number }[] = [
  { id: 'sedentary', label: 'Sedentary — little or no exercise', factor: 1.2 },
  { id: 'light', label: 'Light — 1–3 days/week', factor: 1.375 },
  { id: 'moderate', label: 'Moderate — 3–5 days/week', factor: 1.55 },
  { id: 'active', label: 'Active — 6–7 days/week', factor: 1.725 },
  { id: 'athlete', label: 'Very active — hard training or physical job', factor: 1.9 },
];

export const GOALS: { id: string; label: string; delta: number }[] = [
  { id: 'lose1', label: 'Lose weight (−25%)', delta: -0.25 },
  { id: 'lose', label: 'Mild loss (−15%)', delta: -0.15 },
  { id: 'maintain', label: 'Maintain', delta: 0 },
  { id: 'gain', label: 'Mild gain (+10%)', delta: 0.1 },
  { id: 'gain1', label: 'Gain weight (+20%)', delta: 0.2 },
];

export interface Split {
  id: string;
  label: string;
  p: number;
  c: number;
  f: number; // percent of calories
}

export const SPLITS: Split[] = [
  { id: 'balanced', label: 'Balanced', p: 30, c: 40, f: 30 },
  { id: 'lowcarb', label: 'Lower carb', p: 40, c: 25, f: 35 },
  { id: 'highprotein', label: 'High protein', p: 40, c: 35, f: 25 },
  { id: 'keto', label: 'Keto', p: 25, c: 5, f: 70 },
  { id: 'endurance', label: 'Endurance', p: 25, c: 55, f: 20 },
];

const LB_PER_KG = 2.20462262;
const IN_PER_CM = 0.393701;

export interface CalorieInput {
  sex: Sex;
  age: number;
  unit: UnitSystem;
  weight: number; // kg or lb
  height: number; // cm or in
  activityFactor: number;
  goalDelta: number;
}

export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export interface CalorieResult {
  ok: boolean;
  error?: string;
  bmr: number;
  tdee: number;
  target: number;
  weightKg: number;
}

export function calories(i: CalorieInput): CalorieResult {
  const blank: CalorieResult = { ok: false, bmr: NaN, tdee: NaN, target: NaN, weightKg: NaN };
  if (!(i.age >= 14 && i.age <= 100)) return { ...blank, error: 'Enter an age between 14 and 100' };
  if (!(i.weight > 0)) return { ...blank, error: 'Enter your weight' };
  if (!(i.height > 0)) return { ...blank, error: 'Enter your height' };

  const weightKg = i.unit === 'metric' ? i.weight : i.weight / LB_PER_KG;
  const heightCm = i.unit === 'metric' ? i.height : i.height / IN_PER_CM;
  if (weightKg < 30 || weightKg > 400) return { ...blank, error: 'Weight looks out of range' };
  if (heightCm < 120 || heightCm > 250) return { ...blank, error: 'Height looks out of range' };

  const bmr = bmrMifflin(i.sex, weightKg, heightCm, i.age);
  const tdee = bmr * i.activityFactor;
  let target = tdee * (1 + i.goalDelta);
  // sensible floor
  const floor = i.sex === 'male' ? 1500 : 1200;
  target = Math.max(target, floor);

  return { ok: true, bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target), weightKg };
}

// --- macro split ------------------------------------------------

export interface MacroTargets {
  ok: boolean;
  error?: string;
  calories: number;
  protein: { g: number; kcal: number; pct: number };
  carb: { g: number; kcal: number; pct: number };
  fat: { g: number; kcal: number; pct: number };
  perMeal?: { protein: number; carb: number; fat: number; calories: number };
  proteinPerKg?: number;
}

export type MacroMode =
  | { kind: 'percent'; p: number; c: number; f: number }
  | { kind: 'proteinPerKg'; gPerKg: number; fatPct: number; weightKg: number };

export function macros(cals: number, mode: MacroMode, meals = 0): MacroTargets {
  const blank: MacroTargets = {
    ok: false,
    calories: NaN,
    protein: { g: NaN, kcal: NaN, pct: NaN },
    carb: { g: NaN, kcal: NaN, pct: NaN },
    fat: { g: NaN, kcal: NaN, pct: NaN },
  };
  if (!(cals > 0)) return { ...blank, error: 'Enter a daily calorie target above 0' };

  let pKcal: number;
  let fKcal: number;
  let proteinPerKg: number | undefined;

  if (mode.kind === 'percent') {
    const total = mode.p + mode.c + mode.f;
    if (Math.abs(total - 100) > 0.5) return { ...blank, error: `Your split adds up to ${total}%, not 100%` };
    pKcal = cals * (mode.p / 100);
    fKcal = cals * (mode.f / 100);
  } else {
    if (!(mode.weightKg > 0)) return { ...blank, error: 'Enter your weight for the protein-per-kg mode' };
    if (!(mode.gPerKg > 0)) return { ...blank, error: 'Enter a protein target (g/kg)' };
    pKcal = mode.gPerKg * mode.weightKg * KCAL.protein;
    fKcal = cals * (mode.fatPct / 100);
    proteinPerKg = mode.gPerKg;
    if (pKcal + fKcal > cals) return { ...blank, error: 'Protein + fat already exceed your calories — lower one of them' };
  }

  const cKcal = cals - pKcal - fKcal;
  if (cKcal < 0) return { ...blank, error: 'That split leaves negative carbohydrate — adjust it' };

  const mk = (kcal: number, per: number) => ({
    g: Math.round(kcal / per),
    kcal: Math.round(kcal),
    pct: Math.round((kcal / cals) * 100),
  });

  const protein = mk(pKcal, KCAL.protein);
  const carb = mk(cKcal, KCAL.carb);
  const fat = mk(fKcal, KCAL.fat);

  const out: MacroTargets = { ok: true, calories: Math.round(cals), protein, carb, fat, proteinPerKg };
  if (meals >= 1) {
    out.perMeal = {
      protein: Math.round(protein.g / meals),
      carb: Math.round(carb.g / meals),
      fat: Math.round(fat.g / meals),
      calories: Math.round(cals / meals),
    };
  }
  return out;
}

// --- URL state -------------------------------------------------

export interface ShareState {
  [k: string]: string;
}

export function encodeState(s: ShareState): string {
  const p = new URLSearchParams();
  Object.entries(s).forEach(([k, v]) => {
    if (v !== '' && v != null) p.set(k, v);
  });
  return p.toString();
}

export function decodeState(query: string): ShareState | null {
  const p = new URLSearchParams(query);
  const out: ShareState = {};
  let any = false;
  p.forEach((v, k) => {
    out[k] = v;
    any = true;
  });
  return any ? out : null;
}
