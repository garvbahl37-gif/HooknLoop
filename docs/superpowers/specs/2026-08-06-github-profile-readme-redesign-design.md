# GitHub profile README redesign — design

**Date:** 2026-08-06
**Target repo:** `garvbahl37-gif/garvbahl37-gif` (GitHub profile README)
**Status:** approved in brainstorming, pending spec review

## Problem

The current profile README is a terminal-session concept (ASCII wordmark, neofetch
block, two mermaid diagrams, phosphor green `#00FF9C` on `#0D1117`). It is
distinctive but hand-maintained and static.

Garv found a generated alternative at [GitSkins](https://www.gitskins.com/readme-generator)
(saved to `~/Downloads/README.md`) and wants that visual language adopted.

The GitSkins file cannot be adopted as-is. It misrepresents him.

## Findings from auditing the GitSkins reference

All 7 panels were fetched live and their SVG text extracted. Results:

| Panel | Verdict | Evidence |
|---|---|---|
| `wordmark` | safe | Pure ASCII name art. `label=` override confirmed working |
| `heatmap` | safe | "845 contributions in the last year" |
| `highlights` | safe | `items=` override confirmed working |
| `hero` | **reject** | Renders "Building with TypeScript on GitHub." |
| `stats` | **reject** | Renders a `Stars — 0` tile |
| `system-scan` | **reject** | Renders `Role: TypeScript developer building in public` and `Stars: 0` |
| `stack` | **reject** | Ranks TypeScript 36% / JavaScript 33% / Python 20% |

Two systemic problems:

1. **"0 stars" appears three times** across `highlights`, `stats`, and `stats`' alt
   text. A profile that leads with a zero is worse than one that omits the metric.
2. **Identity mismatch.** Repo-weighted language bytes rank TypeScript first, so
   every auto-written string calls him a TypeScript developer. His actual
   positioning is AI/ML systems engineering — SIH national winner, PyTorch,
   transformers, a two-tower recommender.

The `hero` tagline is **not overridable**. Ten candidate parameters were tested
(`tagline`, `subtitle`, `bio`, `label`, `text`, `lang`, `language`, `primary`,
`primaryLanguage`, `headline`, `desc`, `summary`, `title`, `role`) — every response
returned the identical baseline string.

### Theme enumeration

Themes were enumerated empirically rather than trusting HTTP 200, because unknown
themes silently fall back to GitHub blue `#58a6ff` rather than erroring. Comparing
each theme's dominant colour against that fallback:

**Real (8):** `aurora`, `dracula`, `midnight`, `sunset`, `neon`, `ocean`, `forest`, `matrix`
**Not real (fall back to GitHub blue):** `nord`, `mono`, `ember`, `violet`, `rose`,
`slate`, `cyber`, `solarized`, `gruvbox`, `tokyo`, `catppuccin`, `synthwave`, `crimson`, `sand`

Notably `violet` is **not** a real theme. The chosen violet→cyan direction is
delivered by `midnight`:

```
#818cf8  indigo-400   PRIMARY        #be5bf6  purple   accent
#a5b4fc  indigo-300   secondary      #5beaf6  cyan     accent
#e0e7ff  indigo-100   text           #f6665b  coral    accent
#020617  slate-950    ground
```

Light mode confirmed distinct (`mode=light` returns `#0f172a` / `#0c1ed5`).

## Decisions

| Decision | Choice |
|---|---|
| Reference genre | Profile-README "skins" (GitSkins) |
| Concept | Full replacement of the terminal theme |
| Approach | **Hybrid** — GitSkins panels for live data, owned markdown for identity |
| Theme | `midnight` |
| Contaminated `system-scan` | Replace with hand-written ASCII |
| Delivery | Commit and push to `garvbahl37-gif/garvbahl37-gif` |

### The strategic move on "0 stars"

Do not argue with the star count — **replace the impact metric.** All five featured
projects have live public deployments. "5 products live in production" is both
stronger than "0 stars earned" and verifiably true. Star count is never mentioned.

## Structure

Eight sections. Three are GitSkins images; five are owned markdown.

| # | Section | Source | Notes |
|---|---|---|---|
| 1 | Wordmark | GitSkins | `wordmark?theme=midnight&label=Garv%20Bahl` |
| 2 | Tagline | owned | "Engineer of scalable AI systems." Corrects the TypeScript framing |
| 3 | Links | owned | LinkedIn · Portfolio · Email · NSUT |
| 4 | Highlights | GitSkins | `items=` rewritten — leads with SIH win, never mentions stars |
| 5 | The year, so far | GitSkins | `heatmap?style=jet` — 845 contributions |
| 6 | Profile scan | owned | Hand-written ASCII replacing contaminated `system-scan` |
| 7 | Selected work | owned | Five projects, each with a live demo link |
| 8 | Elsewhere | owned | Contact |

Every GitSkins image is wrapped in `<picture>` with a
`(prefers-color-scheme: light)` source and `mode=light`, matching the reference
file's pattern, so the README survives both GitHub themes.

### Highlights panel content

```
Smart India Hackathon :: National winner
Shipped               :: 5 products live in production
Focus                 :: LLM apps · recsys · realtime voice
```

### Links (section 3)

| Label | Target |
|---|---|
| LinkedIn | `https://www.linkedin.com/in/garvbahl11` |
| Portfolio | `https://garvportfolio-zeta.vercel.app/` |
| Email | `garvbahl37@gmail.com` |
| University | Netaji Subhas University of Technology — B.Tech CSE, Big Data Analytics |

### Profile scan block (section 6)

Rendered as a fenced ```console block. Exact field set — no stars tile, role line
states AI systems engineering:

```
garv@github:~$ ./profile-scan --live

Subject        Garv Bahl
Handle         @garvbahl37-gif
Role           AI systems engineer
Focus          LLM apps · recommenders · realtime voice · docker
Kernel         B.Tech CSE — Big Data Analytics, NSUT
Shipped        5 products live in production
Contributions  845 in the last year · 89 active days
Status         Building | Shipping | Winning hackathons
```

Numbers (845 / 89 / 5) are static text and will drift; see Consequences.

### Selected work

Descriptions taken from each repo's own README, not invented.

| Project | One-liner | Live |
|---|---|---|
| CINEMIND | Two-tower neural recommender — FAISS vector search, FastAPI, Kafka, Redis, MLflow | cinemind-theta.vercel.app |
| Priya (real-estate-ai-calling-agent) | Live AI voice agent — Hindi/Hinglish/English, Gemini Live native audio, Twilio, scored leads to CRM | real-estate-ai-calling-agent.vercel.app/call |
| HireLens | Recruiter-grade resume scoring against a job description — ATS gaps, prioritized fixes | hire-lens-tawny.vercel.app |
| BharatVerse | AI cultural discovery for India — geospatial viz, Salahkar recommender, multilingual AI storytelling | bharat-verse-ruby.vercel.app |
| LUMIERE | Premium MERN e-commerce — storefront, admin dashboard, mobile app | lumiere-gray.vercel.app |

## Consequences and risks

- **Vendor dependency reduced from 7 images to 3.** If GitSkins goes down,
  rate-limits, or paywalls, the identity content still renders. Only the wordmark,
  highlights, and heatmap would break.
- **GitHub camo-caches images**, so "live" data is really "cached" data. Acceptable.
- **The owned ASCII scan block is static.** Its contribution numbers will drift and
  need occasional manual refresh. Accepted deliberately in exchange for an accurate
  role line and no stars tile.
- **The two mermaid diagrams from the current README are dropped.** The gitGraph and
  architecture flowchart do not fit the skin genre. Noted as a real loss.

## Out of scope

- Snake contribution animation (would require a `.github/workflows/` Action)
- Any change to the five project repos themselves
- Portfolio site changes

## Verification

- All GitSkins URLs return HTTP 200 with `image/svg+xml`
- Rendered README contains zero occurrences of "0 stars" or "TypeScript developer"
- Every project link resolves
- Renders correctly in both GitHub light and dark themes
