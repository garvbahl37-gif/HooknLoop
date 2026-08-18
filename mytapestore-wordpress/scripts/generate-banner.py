#!/usr/bin/env python3
"""Generate one collection/industry banner via the Magnific API.

    export MAGNIFIC_API_KEY=...            # never hardcode it here
    python3 scripts/generate-banner.py manufacturing prompts/manufacturing.txt

Writes the raw render to build/banners-raw/<slug>.png. Feed that to
scripts/build-banners.py, which frames it for the band and checks contrast.

WHY A SCRIPT AND NOT CURL

Twenty-six industries at roughly a minute each is not something to drive by
hand: the API is async (POST returns a task_id, then poll), the aspect-ratio
enum is not what you would guess, and a half-finished run leaves the site with
some industries updated and some not. This makes each one a single repeatable
command that either produces a file or fails loudly.

THE KEY COMES FROM THE ENVIRONMENT, ALWAYS. It is not read from a file in the
repo and not accepted as an argument, because arguments end up in shell history.
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
MODEL = "seedream-v4-5"          # newest photoreal model exposed by the API
ASPECT = "cinematic_21_9"        # closest the API offers to the banner band
POLL_EVERY = 6
TIMEOUT = 420

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "build/banners-raw"


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
        headers={
            "x-magnific-api-key": _key(),
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> {e.code}: {e.read().decode()[:400]}")


def generate(slug: str, prompt: str) -> pathlib.Path:
    task = _call("POST", f"/v1/ai/text-to-image/{MODEL}",
                 {"prompt": prompt, "aspect_ratio": ASPECT})["data"]
    tid = task["task_id"]
    print(f"  queued {slug} ({MODEL}, {ASPECT})")

    deadline = time.time() + TIMEOUT
    while time.time() < deadline:
        time.sleep(POLL_EVERY)
        d = _call("GET", f"/v1/ai/text-to-image/{MODEL}/{tid}")["data"]
        status = d.get("status")
        if status == "COMPLETED":
            urls = d.get("generated") or []
            if not urls:
                sys.exit(f"  {slug}: completed with no image")
            OUT.mkdir(parents=True, exist_ok=True)
            dest = OUT / f"{slug}.png"
            with urllib.request.urlopen(urls[0], timeout=120) as src, dest.open("wb") as fh:
                fh.write(src.read())
            print(f"  saved {dest.relative_to(HERE.parent)} ({dest.stat().st_size//1024} KB)")
            return dest
        if status in {"FAILED", "ERROR"}:
            sys.exit(f"  {slug} failed: {d.get('error')}")
        print(f"    {status}…")
    sys.exit(f"  {slug}: timed out after {TIMEOUT}s")


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 1
    slug = argv[1]
    p = pathlib.Path(argv[2])
    prompt = p.read_text().strip() if p.is_file() else argv[2]
    generate(slug, prompt)
    print(f"\n  next:  python3 scripts/build-banners.py build/banners-raw/{slug}.png {slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
