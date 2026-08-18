#!/usr/bin/env python3
"""Exchange a Shopify OAuth `code` for an access token, locally.

USE WITH A webhook.site (OR ANY EXTERNAL) REDIRECT URL
Shopify's redirect delivers a short-lived, single-use authorization CODE — not
a token. The token only exists after that code is exchanged against the shop's
own domain using the client secret. So when the redirect points at an external
catcher, that catcher sees the code and nothing more.

This script does the second half on this machine: code -> token, straight into
newsletter/.env.local. The token is therefore never transmitted to, stored by,
or visible from the external catcher.

Two properties of the code that matter:
  · it expires in minutes — copy it promptly;
  · it is single-use — if an exchange fails, re-authorise for a fresh one.

If the client secret has been exposed anywhere (a chat window, a screenshot, a
shared terminal), ROTATE IT BEFORE INSTALLING. A captured code plus a known
secret is a token in someone else's hands; a captured code plus a rotated
secret is inert.

The token is never printed — only a masked fingerprint.

    python3 oauth_exchange.py --code <code from the redirect>

Secret is read from MTS_CLIENT_SECRET, else SHOPIFY_APP_CLIENT_SECRET in
newsletter/.env.local.
"""
import argparse
import json
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENV = ROOT / "newsletter" / ".env.local"
SHOP = "cvbpp2-up.myshopify.com"
VAR = "SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE"


def env_val(key):
    if not ENV.exists():
        return None
    for line in ENV.read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


def write_env(var, token):
    txt = ENV.read_text() if ENV.exists() else ""
    line = f"{var}={token}"
    if re.search(rf"^{var}=.*$", txt, re.M):
        txt = re.sub(rf"^{var}=.*$", line, txt, flags=re.M)
    else:
        txt = txt.rstrip("\n") + f"\n{line}\n"
    ENV.write_text(txt)
    os.chmod(ENV, 0o600)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--code", help="just the `code` value")
    ap.add_argument("--url", help="or paste the WHOLE redirect URL / query string; "
                                  "the code is pulled out of it")
    ap.add_argument("--url-file", dest="url_file",
                    help="path to a file containing the redirect URL. Preferred: "
                         "keeps the code out of shell history and out of any "
                         "command line, which is where credentials leak from.")
    ap.add_argument("--shop", default=SHOP)
    a = ap.parse_args()

    if a.url_file and not a.url:
        p = pathlib.Path(a.url_file).expanduser()
        if not p.exists():
            sys.exit(f"no such file: {p}")
        a.url = p.read_text().strip()
        if not a.url:
            sys.exit(f"{p} is empty — paste the full redirect URL into it")

    # Copying one parameter out of a query string by eye is where this goes
    # wrong, so accept the whole thing and extract it here.
    if a.url and not a.code:
        q = urllib.parse.urlparse(a.url).query or a.url
        got = urllib.parse.parse_qs(q).get("code", [])
        if not got:
            sys.exit("no `code=` found in that URL. Paste the full redirect URL, "
                     "e.g. https://webhook.site/...?code=abc&hmac=...&shop=...")
        a.code = got[0]
        if a.shop == SHOP:
            shop_q = urllib.parse.parse_qs(q).get("shop", [])
            if shop_q:
                a.shop = shop_q[0]

    if not a.code:
        sys.exit("need --code <value> or --url '<whole redirect URL>'")

    if a.code.startswith("<") or a.code.endswith(">"):
        sys.exit("that is the placeholder, not a real code — paste the actual "
                 "value from the redirect (about 32 hex characters).")

    cid = os.environ.get("MTS_CLIENT_ID") or env_val("SHOPIFY_APP_CLIENT_ID")
    sec = os.environ.get("MTS_CLIENT_SECRET") or env_val("SHOPIFY_APP_CLIENT_SECRET")
    if not cid or not sec:
        sys.exit("Need client id + secret.\n"
                 "  MTS_CLIENT_ID=... MTS_CLIENT_SECRET=... python3 oauth_exchange.py --code ...\n"
                 "or put SHOPIFY_APP_CLIENT_ID / SHOPIFY_APP_CLIENT_SECRET in newsletter/.env.local")

    body = json.dumps({"client_id": cid, "client_secret": sec, "code": a.code}).encode()
    req = urllib.request.Request(f"https://{a.shop}/admin/oauth/access_token",
                                 data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
    except Exception as e:                                  # noqa: BLE001
        detail = ""
        if hasattr(e, "read"):
            try:
                detail = " -> " + e.read().decode()[:200]
            except Exception:                               # noqa: BLE001
                pass
        sys.exit(f"exchange failed: {e}{detail}\n"
                 "Codes are single-use and expire in minutes — re-authorise for a fresh one. "
                 "`invalid_client` means the secret does not match the app (rotated?).")

    tok = data.get("access_token")
    if not tok:
        sys.exit(f"no access_token in response: {str(data)[:200]}")

    write_env(VAR, tok)
    print(f"CAPTURED -> {ENV} as {VAR}")
    print(f"  fingerprint : {tok[:6]}…{tok[-4:]}  (len {len(tok)})")
    print(f"  granted     : {data.get('scope', '?')}")
    print("  file mode   : 600")
    print("\nRotate the client secret now if it has ever been exposed — "
          "this token stays valid afterwards.")


if __name__ == "__main__":
    main()
