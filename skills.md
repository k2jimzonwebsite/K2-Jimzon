# K2 Jimzon — Recommended Skills Map

This document maps the K2 Jimzon tech stack and design philosophy to specific AI agent skills available in the newly installed `antigravity-skills` and `agentic-awesome-skills` repositories.

Use this reference to activate the right skills when generating code, reviewing PRs, or modifying the architecture. 

## 1. Frontend & React Core
The project uses React 19 and Vite with a custom context-based store.

* **`frontend-developer` / `react-modernization`** (antigravity-skills)
  * **When to use:** Building new React components, managing `StoreContext`, or handling client-side state.
* **`core-components`** (agentic-awesome-skills)
  * **When to use:** Creating reusable UI components (Buttons, Pills, Badges) following the established patterns.

## 2. Styling & Design System (Tailwind v4)
The project strictly follows `DESIGN.md` — a high-end, editorial, near-white canvas with very specific color usage (Crimson for action, Forest for trust, Blue for wholesale). It uses Tailwind CSS v4.

* **`tailwind-patterns`** (agentic-awesome-skills)
  * **When to use:** Writing or refactoring CSS. This skill specifically understands Tailwind v4 principles, CSS-first configuration, and modern patterns.
* **`tailwind-design-system`** (antigravity-skills / agentic-awesome-skills)
  * **When to use:** When adding new semantic tokens, maintaining the design system, or ensuring responsive patterns adhere to the editorial look.
* **`impeccable`** (Local `.agents/skills/impeccable`)
  * **When to use:** UX review, visual hierarchy auditing, ensuring the "quiet luxury" aesthetic is maintained without looking like a generic template.

## 3. 3D Web Experience (Three.js)
The hero section and product reviews feature an interactive 3D globe powered by `@react-three/fiber` and `@react-three/drei`.

* **`threejs-skills`** (agentic-awesome-skills)
  * **When to use:** General modifications to the `ProductGlobe` or WebGL experiences.
* **`threejs-interaction`** (agentic-awesome-skills)
  * **When to use:** Modifying how the user drags, spins, or clicks the globe (e.g., raycasting, pointer events).
* **`threejs-animation` & `threejs-fundamentals`** (agentic-awesome-skills)
  * **When to use:** Adding new animations to the globe, updating camera positioning, or tweaking renderer settings.

## 4. Backend & Database (Supabase)
The CMS for the globe products and reviews is backed by Supabase with Row-Level Security (RLS).

* **`supabase`** (agentic-awesome-skills)
  * **When to use:** The primary skill for ANY Supabase task, including using `supabase-js`, auth issues, or database queries.
* **`supabase-postgres-best-practices`** (agentic-awesome-skills)
  * **When to use:** When modifying `0001_globe_cms.sql`, writing new migrations, or designing Postgres schemas with RLS policies.
* **`supabase-automation`** (agentic-awesome-skills)
  * **When to use:** When automating project administration or executing SQL.

## 5. E-Commerce & Product
The site converts users via a "monthly manifest" trust model.

* **`cro` (Conversion Rate Optimization)** / **`form-cro`** (agentic-awesome-skills)
  * **When to use:** Optimizing the Checkout, Pasabuy, or Wholesale forms to increase conversion while maintaining the "quiet confidence" brand voice.
* **`seo-structure-architect`** (agentic-awesome-skills)
  * **When to use:** Ensuring the frontend semantic HTML and meta tags are optimized for search engines.

---
> **Note for AI Agents (including Claude Code):** When making changes to the K2 Jimzon codebase, always cross-reference `PRODUCT.md` and `DESIGN.md` in the root directory. They contain strict anti-patterns (e.g., no generic e-commerce badge spam, no countdown timers) that must be followed.
