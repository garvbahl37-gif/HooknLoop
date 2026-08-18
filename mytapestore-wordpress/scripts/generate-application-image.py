#!/usr/bin/env python3
"""Generate one application-image triptych for a product type.

    MAGNIFIC_API_KEY=... python3 scripts/generate-application-image.py <slug> <prompt-file-or-text>

WHY nano-banana-pro AND NOT seedream

The house format — matched from the live site's Hang-Tab-Applications.png — puts a
solid black bar under each of three panels carrying a bold white uppercase
caption. That is TEXT INSIDE THE IMAGE, and Seedream renders text as convincing
gibberish: correct letterforms, wrong words. On a trade store a caption that
almost says "STRUCTURAL GLAZING" is worse than no caption, because it looks like
a printing fault rather than a design choice.

nano-banana-pro is the only model this key exposes that renders legible type.
Probed rather than assumed: POSTing an empty body to each candidate returns 400
where the model exists and 404 where it does not.

    seedream-v4-5     400  exists
    seedream-v4       200  exists
    nano-banana-pro   400  exists   <- text-capable
    flux-dev          200  exists
    everything else   404

ASPECT: 3:2, read off the reference image (768x512). The API's enum was probed
the same way, by sending a deliberately invalid value and reading the rejection.

Output goes to build/application-raw/<slug>.png. Nothing is attached to a product
here — install-application-images.php does that, so a bad generation can be
re-run without touching the database.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

BASE = "https://api.magnific.com"
MODEL = "nano-banana-pro"
ASPECT = "3:2"
POLL_EVERY = 6
TIMEOUT = 600

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "build/application-raw"


def _key() -> str:
    key = os.environ.get("MAGNIFIC_API_KEY", "").strip()
    if not key:
        sys.exit("MAGNIFIC_API_KEY is not set")
    return key


def _call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"x-magnific-api-key": _key(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()[:400]}") from None


def generate(slug: str, prompt: str, *, force: bool = False) -> pathlib.Path:
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{slug}.png"

    # Re-running the batch must not re-buy artwork that already arrived.
    if dest.is_file() and not force:
        print(f"  = {slug} already generated ({dest.stat().st_size // 1024} KB)")
        return dest

    task = _call("POST", f"/v1/ai/text-to-image/{MODEL}",
                 {"prompt": prompt, "aspect_ratio": ASPECT})["data"]
    tid = task["task_id"]
    print(f"  queued {slug}")

    deadline = time.time() + TIMEOUT
    while time.time() < deadline:
        time.sleep(POLL_EVERY)
        d = _call("GET", f"/v1/ai/text-to-image/{MODEL}/{tid}")["data"]
        status = d.get("status")

        if status == "COMPLETED":
            urls = d.get("generated") or []
            if not urls:
                raise RuntimeError(f"{slug}: completed with no image")
            with urllib.request.urlopen(urls[0], timeout=180) as src:
                dest.write_bytes(src.read())
            print(f"  saved {slug}.png ({dest.stat().st_size // 1024} KB)")
            return dest

        if status in {"FAILED", "ERROR"}:
            raise RuntimeError(f"{slug} failed: {d.get('error')}")

    raise RuntimeError(f"{slug}: timed out after {TIMEOUT}s")


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 1

    slug = argv[1]
    p = pathlib.Path(argv[2])
    prompt = p.read_text(encoding="utf-8").strip() if p.is_file() else argv[2]

    generate(slug, prompt, force="--force" in argv)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
