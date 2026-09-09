import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ACTIVITY,
  calories,
  decodeState,
  encodeState,
  GOALS,
  macros,
  MacroMode,
  Sex,
  SPLITS,
  UnitSystem,
} from './macros.ts';

const LS_KEY = 'macro-calc:v1';
type Source = 'calc' | 'known';
type SplitMode = 'preset' | 'custom' | 'perkg';

export default function App() {
  const [source, setSource] = useState<Source>('calc');

  const [sex, setSex] = useState<Sex>('male');
  const [unit, setUnit] = useState<UnitSystem>('metric');
  const [age, setAge] = useState('30');
  const [weight, setWeight] = useState('80');
  const [height, setHeight] = useState('180');
  const [activity, setActivity] = useState(ACTIVITY[2].id);
  const [goal, setGoal] = useState('maintain');

  const [knownCals, setKnownCals] = useState('2200');

  const [splitMode, setSplitMode] = useState<SplitMode>('preset');
  const [preset, setPreset] = useState(SPLITS[0].id);
  const [cp, setCp] = useState(30);
  const [cc, setCc] = useState(40);
  const [cf, setCf] = useState(30);
  const [gPerKg, setGPerKg] = useState(1.8);
  const [fatPct, setFatPct] = useState(30);

  const [meals, setMeals] = useState('4');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = decodeState(window.location.search) ?? safeLS();
    if (!s) return;
    if (s.src === 'known') setSource('known');
    if (s.sex === 'female') setSex('female');
    if (s.u === 'imperial') setUnit('imperial');
    if (s.age) setAge(s.age);
    if (s.w) setWeight(s.w);
    if (s.h) setHeight(s.h);
    if (s.act) setActivity(s.act);
    if (s.goal) setGoal(s.goal);
    if (s.kc) setKnownCals(s.kc);
    if (s.sm) setSplitMode(s.sm as SplitMode);
    if (s.pr) setPreset(s.pr);
    if (s.cp) setCp(Number(s.cp));
    if (s.cc) setCc(Number(s.cc));
    if (s.cf) setCf(Number(s.cf));
    if (s.gk) setGPerKg(Number(s.gk));
    if (s.fp) setFatPct(Number(s.fp));
    if (s.m) setMeals(s.m);
  }, []);

  const state = useMemo(
    () => ({
      src: source,
      sex,
      u: unit,
      age,
      w: weight,
      h: height,
      act: activity,
      goal,
      kc: knownCals,
      sm: splitMode,
      pr: preset,
      cp: String(cp),
      cc: String(cc),
      cf: String(cf),
      gk: String(gPerKg),
      fp: String(fatPct),
      m: meals,
    }),
    [source, sex, unit, age, weight, height, activity, goal, knownCals, splitMode, preset, cp, cc, cf, gPerKg, fatPct, meals],
  );

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const cal = useMemo(
    () =>
      calories({
        sex,
        age: Number(age),
        unit,
        weight: Number(weight),
        height: Number(height),
        activityFactor: ACTIVITY.find((a) => a.id === activity)?.factor ?? 1.55,
        goalDelta: GOALS.find((g) => g.id === goal)?.delta ?? 0,
      }),
    [sex, age, unit, weight, height, activity, goal],
  );

  const targetCals = source === 'calc' ? (cal.ok ? cal.target : NaN) : Number(knownCals);
  const weightKg = unit === 'metric' ? Number(weight) : Number(weight) / 2.20462262;

  const mode: MacroMode = useMemo(() => {
    if (splitMode === 'perkg') return { kind: 'proteinPerKg', gPerKg, fatPct, weightKg };
    if (splitMode === 'custom') return { kind: 'percent', p: cp, c: cc, f: cf };
    const s = SPLITS.find((x) => x.id === preset) ?? SPLITS[0];
    return { kind: 'percent', p: s.p, c: s.c, f: s.f };
  }, [splitMode, gPerKg, fatPct, weightKg, cp, cc, cf, preset]);

  const result = useMemo(() => macros(targetCals, mode, Math.max(1, Number(meals) || 1)), [targetCals, mode, meals]);

  const customTotal = cp + cc + cf;

  const share = useCallback(() => {
    const qs = encodeState(state as Record<string, string>);
    window.history.replaceState(null, '', `?${qs}`);
    navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?${qs}`).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }, [state]);

  const U = unit === 'metric' ? { w: 'kg', h: 'cm' } : { w: 'lb', h: 'in' };

  return (
    <div className="wrap">
      <header>
        <h1>Macro Calculator</h1>
        <p className="sub">
          Split your daily calories into <b>protein</b>, <b>carbs</b> and <b>fat</b> — by a preset
          ratio, a custom one, or a protein target per kilogram of body weight — with per-meal
          numbers.
        </p>
      </header>

      <section className="card">
        <div className="seg">
          <button className={source === 'calc' ? 'on' : ''} onClick={() => setSource('calc')}>Work out my calories</button>
          <button className={source === 'known' ? 'on' : ''} onClick={() => setSource('known')}>I know my target</button>
        </div>

        {source === 'calc' ? (
          <>
            <div className="segrow">
              <div className="seg small">
                <button className={sex === 'male' ? 'on' : ''} onClick={() => setSex('male')}>Male</button>
                <button className={sex === 'female' ? 'on' : ''} onClick={() => setSex('female')}>Female</button>
              </div>
              <div className="seg small">
                <button className={unit === 'metric' ? 'on' : ''} onClick={() => setUnit('metric')}>Metric</button>
                <button className={unit === 'imperial' ? 'on' : ''} onClick={() => setUnit('imperial')}>Imperial</button>
              </div>
            </div>
            <div className="grid3">
              <label className="field"><span>Age</span><input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} /></label>
              <label className="field"><span>Weight ({U.w})</span><input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
              <label className="field"><span>Height ({U.h})</span><input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            </div>
            <label className="field"><span>Activity</span>
              <select value={activity} onChange={(e) => setActivity(e.target.value)}>
                {ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
            <label className="field"><span>Goal</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </label>
            {cal.ok ? (
              <p className="calline">BMR {cal.bmr} · TDEE {cal.tdee} → <b>target {cal.target} kcal/day</b></p>
            ) : (
              <p className="warn">{cal.error}</p>
            )}
          </>
        ) : (
          <label className="field"><span>Daily calorie target</span>
            <div className="inp"><input inputMode="numeric" value={knownCals} onChange={(e) => setKnownCals(e.target.value)} /><em>kcal</em></div>
          </label>
        )}
      </section>

      <section className="card">
        <div className="seg">
          <button className={splitMode === 'preset' ? 'on' : ''} onClick={() => setSplitMode('preset')}>Preset ratio</button>
          <button className={splitMode === 'custom' ? 'on' : ''} onClick={() => setSplitMode('custom')}>Custom %</button>
          <button className={splitMode === 'perkg' ? 'on' : ''} onClick={() => setSplitMode('perkg')}>Protein / kg</button>
        </div>

        {splitMode === 'preset' && (
          <div className="presets">
            {SPLITS.map((s) => (
              <button key={s.id} className={preset === s.id ? 'on' : ''} onClick={() => setPreset(s.id)}>
                {s.label}<i>{s.p}/{s.c}/{s.f}</i>
              </button>
            ))}
          </div>
        )}
        {splitMode === 'custom' && (
          <div className="customsplit">
            <label><span>Protein %</span><input type="number" value={cp} onChange={(e) => setCp(Number(e.target.value) || 0)} /></label>
            <label><span>Carbs %</span><input type="number" value={cc} onChange={(e) => setCc(Number(e.target.value) || 0)} /></label>
            <label><span>Fat %</span><input type="number" value={cf} onChange={(e) => setCf(Number(e.target.value) || 0)} /></label>
            <p className={`total ${customTotal === 100 ? 'ok' : 'bad'}`}>Total: {customTotal}%</p>
          </div>
        )}
        {splitMode === 'perkg' && (
          <div className="customsplit">
            <label><span>Protein (g per {U.w === 'kg' ? 'kg' : 'kg'})</span><input type="number" step="0.1" value={gPerKg} onChange={(e) => setGPerKg(Number(e.target.value) || 0)} /></label>
            <label><span>Fat % of calories</span><input type="number" value={fatPct} onChange={(e) => setFatPct(Number(e.target.value) || 0)} /></label>
            <p className="hint">Carbs fill whatever calories are left. Common protein targets are 1.6–2.2 g/kg.</p>
          </div>
        )}

        <label className="field meals"><span>Meals per day</span><input inputMode="numeric" value={meals} onChange={(e) => setMeals(e.target.value)} /></label>
      </section>

      {result.ok ? (
        <section className="card result">
          <div className="bar" aria-hidden="true">
            <span className="p" style={{ width: `${result.protein.pct}%` }} />
            <span className="c" style={{ width: `${result.carb.pct}%` }} />
            <span className="f" style={{ width: `${result.fat.pct}%` }} />
          </div>
          <div className="macros">
            <div className="macro p">
              <span>Protein</span>
              <b>{result.protein.g} g</b>
              <em>{result.protein.kcal} kcal · {result.protein.pct}%</em>
            </div>
            <div className="macro c">
              <span>Carbs</span>
              <b>{result.carb.g} g</b>
              <em>{result.carb.kcal} kcal · {result.carb.pct}%</em>
            </div>
            <div className="macro f">
              <span>Fat</span>
              <b>{result.fat.g} g</b>
              <em>{result.fat.kcal} kcal · {result.fat.pct}%</em>
            </div>
          </div>
          <p className="caltotal">{result.calories} kcal/day{result.proteinPerKg ? ` · ${result.proteinPerKg} g/kg protein` : ''}</p>
          {result.perMeal && (
            <p className="permeal">
              Per meal (× {meals}): <b>{result.perMeal.protein} g</b> P · <b>{result.perMeal.carb} g</b> C ·{' '}
              <b>{result.perMeal.fat} g</b> F · {result.perMeal.calories} kcal
            </p>
          )}
          <button className="ghost" onClick={share}>{copied ? 'Link copied' : 'Share these targets'}</button>
        </section>
      ) : (
        <p className="warn">{result.error}</p>
      )}

      <p className="disclaimer">
        <b>Estimate only.</b> These figures use the Mifflin-St Jeor equation and standard
        macronutrient ratios (4 kcal/g for protein and carbohydrate, 9 kcal/g for fat). They are a
        starting point, not medical or dietary advice — individual needs vary, and you should talk
        to a doctor or a registered dietitian before making significant changes, especially with
        any health condition, during pregnancy, or for a child.
      </p>

      <section className="explainer">
        <h2>What "macros" means</h2>
        <p>
          Macronutrients are the three things that supply energy: <b>protein</b>, <b>carbohydrate</b>
          and <b>fat</b>. Tracking them — not just total calories — helps with keeping muscle while
          losing fat, fuelling training, or following a specific way of eating.
        </p>
        <h3>How the split is chosen</h3>
        <p>
          <b>Balanced</b> (30/40/30) suits most people. <b>Higher protein</b> or <b>protein per
          kg</b> helps preserve muscle in a calorie deficit. <b>Lower carb</b> and <b>keto</b> shift
          energy to fat. <b>Endurance</b> loads carbohydrate for long training. Protein and carbs
          are 4 calories per gram; fat is 9.
        </p>
        <h3>Per-meal targets</h3>
        <p>
          Spreading protein across the day (roughly 0.4 g/kg per meal, 3–4 times) is a common
          recommendation for muscle protein synthesis. The per-meal row divides your daily numbers
          evenly as a simple guide.
        </p>
        <h3>Adjust from real results</h3>
        <p>
          Any calculator is an estimate. Track your weight and how you feel over 2–3 weeks and
          nudge calories up or down 100–200 at a time.
        </p>
        <footer>Macro Calculator · estimate only · works offline · nothing is uploaded</footer>
      </section>
    </div>
  );
}

function safeLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
