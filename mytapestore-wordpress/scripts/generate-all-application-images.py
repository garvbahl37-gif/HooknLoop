#!/usr/bin/env python3
"""Generate every application plate listed in a prompts file.

    MAGNIFIC_API_KEY=... python3 scripts/generate-all-application-images.py prompts.json

prompts.json is [{"slug": "...", "prompt": "...", "captions": [...]}, ...]

RESUMABLE BY DESIGN. Each render is paid for, so a slug whose PNG already exists
in build/application-raw/ is skipped rather than re-bought. That makes this safe
to re-run after a network drop, a rate limit, or a single bad render deleted by
hand — only the missing ones are generated.

SEQUENTIAL, NOT PARALLEL. The API queues a task per call and the free-tier
behaviour under concurrent submission is unknown; a rejected batch costs the same
as an accepted one. Thirty renders at roughly a minute each is fifteen minutes
unattended, which is not worth risking the credits to shorten.
"""

from __future__ import annotations

import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

# The generator module has hyphens in its name, so it is loaded by path
# rather than imported by name.
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "genapp", pathlib.Path(__file__).resolve().parent / "generate-application-image.py"
)
genapp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(genapp)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1

    prompts = json.loads(pathlib.Path(argv[1]).read_text(encoding="utf-8"))
    if isinstance(prompts, dict):
        prompts = prompts.get("prompts", [])

    print(f"  {len(prompts)} plate(s) requested\n")

    ok, failed, skipped = 0, [], 0

    for i, entry in enumerate(prompts, 1):
        slug = entry["slug"]
        dest = genapp.OUT / f"{slug}.png"

        if dest.is_file():
            print(f"  [{i:>2}/{len(prompts)}] = {slug} (already generated)")
            skipped += 1
            continue

        print(f"  [{i:>2}/{len(prompts)}] {slug}: {' | '.join(entry.get('captions', []))}")

        try:
            genapp.generate(slug, entry["prompt"])
            ok += 1
        except Exception as exc:                       # noqa: BLE001 — report and continue
            print(f"      FAILED: {exc}")
            failed.append(slug)

        # A courtesy gap between submissions; the API is not documented as
        # rate-limited but hammering an image endpoint rarely ends well.
        time.sleep(2)

    print(f"\n  generated {ok}, skipped {skipped}, failed {len(failed)}")

    if failed:
        print("  failed slugs (re-run to retry just these):")
        for s in failed:
            print(f"    {s}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
