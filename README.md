# Macro Calculator

Split a daily calorie target into **protein**, **carbohydrate** and **fat**.

**Calories:** either enter your own daily target, or work it out from sex, age, weight, height,
activity level and a weight goal (Mifflin-St Jeor BMR × activity, then a percentage for the
goal, with a sensible floor).

**Split:** choose a **preset ratio** (Balanced, Lower carb, High protein, Keto, Endurance), a
**custom %** (with a live "adds to 100%" check), or a **protein-per-kilogram** target with a fat
% — carbs fill the rest.

**Output:** grams / calories / % for each macro, a stacked ratio bar, the calorie total, and a
per-meal row for your chosen number of meals. Inputs save to `localStorage` and are shareable
via the URL.

> **Estimate only — not medical or dietary advice.** Uses published formulas (Mifflin-St Jeor,
> Atwater 4/4/9 kcal/g). Talk to a doctor or registered dietitian before significant changes.

## Stack

React 18 + TypeScript + Vite, no runtime dependencies beyond React. Logic is in the pure module
`src/macros.ts`. Tests: `node --experimental-strip-types src/macros.test.mjs` (12 cases).

Static build, deployed to Cloudflare Workers. Everything runs in your browser.
