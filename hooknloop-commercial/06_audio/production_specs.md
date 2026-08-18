# PRODUCTION SPECS — Sound · Music · Grade · End-card · Pipeline · QA
### "The Things That Hold" (HooknLoop)

---

## 1. SOUND-DESIGN MAP
The **rip and the press are the percussion.** The sound everyone recognises becomes the brand's signature.
- **Rip textures to build:** slow tender peel (S15), fast rip (S08), small strip (S04), big heavy-duty rip (S09), soft-loop press (S02/S11/S16).
- **Percussion bed (8–30s):** rip / press quantised loosely to the felt-piano tempo. `RIP · PRESS · RIP-RIP · PRESS` becomes the groove.
- **Ambience per world (diegetic, layered):** kitchen kettle+bird (S03/04) · needle+room tone (S06) · roller-door daylight hum (S07) · site tools (S08) · magpie+strap creak+dawn (S09) · sunroom birds+quiet (S11) · classroom murmur (S12) · cicadas+door clunk (S13) · high-bay hum (S14).
- **Human layer:** breath (S01), fabric, hands on surfaces, footsteps — mixed low.
- **Reveal (35–41s):** ambience drops out; a low heartbeat under the swell; then **total silence** before the end.
- **End (42.5–45s):** one clean **PRESS**, logo, silence. No music tail.
- Mix targets: **-24 LUFS broadcast** / **-14 LUFS social**; true-peak ≤ -1 dBTP. Dialogue/VO ~ -12 LUFS in the mix.

## 2. MUSIC BRIEF
- **Palette:** felt piano, subtle analogue warmth, soft strings arriving late, organic percussion **derived from the HooknLoop rips** themselves.
- **NOT** epic trailer music; no big drum hits; no rising EDM.
- **Arc:** silence/room-tone (0–14s) → single felt-piano notes enter (S07, ~14s) → gentle build with rip-percussion (14–30s) → tender low point at the release (S15, 30s) → warm swell into the hero (S17) → **drop to nothing** at 41s → one press.
- Tempo ~70–84 bpm, rubato feel. Key: warm major with one unresolved suspension that lands on the logo.
- Deliver stems (piano / strings / perc / texture) for the cutdowns.

## 3. COLOUR-GRADE SPEC
- Premium restrained grade; natural AU daylight; **warm skin without orange skin**; rich blacks (lift shadows just off zero); controlled highlight rolloff; natural greens/sky.
- No heavy LUT, no oversaturation. Protect the ONE orange (`#E87722`) — grade so it's the most saturated thing in S09/S17 and nowhere else.
- Match colour science across all AI sources first (neutralise each shot to a common reference chart), **then** add fine 35mm grain + subtle gate-weight halation as the final layer.
- Deliverable LUT/CDL applied uniformly; per-shot only for continuity fixes.

## 4. END-CARD DESIGN (S19)
- Ground: warm white `#FFF7F0`. Generous negative space; nothing crowded.
- Two black strips (`#111318`) slide in from opposite edges, meet centre → **PRESS** (one soft click).
- Wordmark resolves: **HooknLoop** — blue `#003B98`, orange **n** `#E87722`. (Use supplied SVG `img/logo-header.svg`; never distort/recolour.)
- Line 2 (small, grey `#8A8B8E`, generous tracking): **Made to connect.**
- Line 3 (smaller): **HooknLoop.com.au**
- Type + logo are **composited deterministically** (After Effects / FFmpeg drawtext) — NEVER baked into generative video. Verify AA contrast on the ground.
- Hold 2.5s → cut to black.

## 5. MAGNIFIC / GENERATION PIPELINE (per hero shot)
`concept frame → reference frame (continuity-locked) → controlled generation → Magnific detail pass → continuity check → image-to-video → best-frame extract → optional Magnific refine → edit → colour → master`
- **Magnific creativity:** LOW on product/macro (preserve geometry, weave, buckle, logo); MEDIUM only on atmospheric establishers (dawn yard, gum trees).
- Magnific must never: invent text/logos, change product shape/colour, add fingers, alter faces inconsistently, over-sharpen skin, produce plastic textures.
- **Tooling available in this session:** Higgsfield MCP (`generate_image`, `generate_video`, `upscale_image/video`, `reframe` for 9:16 & 1:1, `remove_background`), Magnific keys (provided by user — stored, never printed), FFmpeg for deterministic composite/export. Reframe > re-generate for the vertical/square cuts (saves credits).

## 6. QA CHECKLIST (per frame, before accept)
hands ✓ fingers ✓ eyes/teeth ✓ ears ✓ product geometry ✓ weave ✓ strap colour = `#E87722` ✓ no legible fake logos/text ✓ shadows consistent ✓ no floating/duplicate objects ✓ no warped architecture ✓ faces consistent w/ ref ✓ no temporal flicker/texture-crawl ✓ orange only where allowed ✓ → else diagnose, re-prompt, regenerate, log in `10_qa/qa_report.md`. **Never accept "good enough."**

## 7. EXPORT SPECS
| Deliverable | Aspect | Res | Notes |
|---|---|---|---|
| Master 45s | 16:9 | 3840×2160 (4K) + 1080p | ProRes 422 HQ master + H.264 |
| TVC 30s | 16:9 | 4K/1080p | broadcast -24 LUFS |
| Social 15s | 16:9 + 9:16 | 1080p | -14 LUFS, captions optional |
| Bumper 6s | 16:9 + 9:16 | 1080p | YouTube bumper spec |
| Vertical | 9:16 | 1080×1920 | via `reframe`, protect centre |
| Square | 1:1 | 1080×1080 | via `reframe` |

## 8. CREDIT DISCIPLINE (per user instruction)
- Generate **reference stills first** (small batch) to lock look + characters BEFORE any video.
- One hero macro + one human ref approved by user → then expand.
- Prefer `reframe`/`upscale` over re-generation for cutdowns.
- Log every generation + credit cost in `10_qa/qa_report.md`. Stop and check in at each budget checkpoint.
