#!/usr/bin/env python3
"""One-shot local OAuth catcher for the MyTapeStore Partner app.

WHY THIS EXISTS
A Partner-dashboard app only hands over an access token at the end of an OAuth
install, so the redirect URL has to be somewhere that can receive it. Pointing
that at a public relay (webhook.site and friends) means the token — full
read/write on products, orders, themes AND customer PII — is stored on a third
party's server and readable by anyone with the URL.

This is the same flow, terminating on the machine that actually needs the
token. Shopify -> localhost -> a gitignored .env file. Nothing leaves the box.

WHAT IT DOES
  1. Serves http://localhost:3456/callback exactly once.
  2. Verifies Shopify's HMAC over the query string before trusting ANY of it,
     so a forged callback cannot make us exchange an attacker's code.
  3. Checks `state` to close the CSRF hole.
  4. Exchanges code -> access token server-side, over TLS, to the shop domain.
  5. Appends/updates the token in newsletter/.env.local and exits.

The token is NEVER printed. It goes to the file; the terminal only ever sees a
masked fingerprint, so it cannot leak through a log or a screen share.

    python3 oauth_capture.py            # prints the install URL, then waits
"""
import hashlib
import hmac
import http.server
import json
import os
import pathlib
import re
import secrets
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENV = ROOT / "newsletter" / ".env.local"
SHOP = "cvbpp2-up.myshopify.com"
PORT = 3456
REDIRECT = f"http://localhost:{PORT}/callback"
VAR = "SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE"

SCOPES = ",".join([
    # what the existing custom app already had
    "read_products", "write_products",
    "read_content", "write_content",
    "read_themes", "write_themes",
    "read_files", "write_files",
    "read_discounts", "write_discounts",
    "read_inventory", "write_inventory",
    "read_online_store_navigation", "write_online_store_navigation",
    # what the account work needs (PII — treat the token accordingly)
    "read_customers", "write_customers",
    "read_orders",
    # what makes the app "extendable" so it can mint a Storefront token
    "unauthenticated_read_customers", "unauthenticated_write_customers",
    "unauthenticated_read_product_listings",
    "unauthenticated_read_checkouts", "unauthenticated_write_checkouts",
])

STATE = secrets.token_urlsafe(24)


def env_val(key):
    if not ENV.exists():
        return None
    for line in ENV.read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


CLIENT_ID = os.environ.get("MTS_CLIENT_ID") or env_val("SHOPIFY_APP_CLIENT_ID")
CLIENT_SECRET = (os.environ.get("MTS_CLIENT_SECRET")
                 or env_val("SHOPIFY_APP_CLIENT_SECRET"))

if not CLIENT_ID or not CLIENT_SECRET:
    sys.exit(
        "Missing app credentials.\n"
        "Add these two lines to newsletter/.env.local, then re-run:\n"
        "  SHOPIFY_APP_CLIENT_ID=<client id>\n"
        "  SHOPIFY_APP_CLIENT_SECRET=<client secret>\n"
        "(Use the CURRENT secret — rotate it first if it has been pasted "
        "anywhere, including a chat window.)")


def valid_hmac(query):
    """Shopify signs the callback. Verify before trusting anything in it."""
    pairs = urllib.parse.parse_qsl(query, keep_blank_values=True)
    got = dict(pairs).get("hmac", "")
    msg = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted(pairs) if k != "hmac")
    want = hmac.new(CLIENT_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(want, got)


def write_env(token):
    txt = ENV.read_text() if ENV.exists() else ""
    line = f"{VAR}={token}"
    if re.search(rf"^{VAR}=.*$", txt, re.M):
        txt = re.sub(rf"^{VAR}=.*$", line, txt, flags=re.M)
    else:
        txt = txt.rstrip("\n") + f"\n\n# Shopify OAuth token (MyTapeStore). Never commit.\n{line}\n"
    ENV.write_text(txt)
    os.chmod(ENV, 0o600)


class Handler(http.server.BaseHTTPRequestHandler):
    done = False

    def log_message(self, *a):                    # keep the token out of logs
        pass

    def _reply(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(f"<h2>{msg}</h2>".encode())

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self._reply(404, "Not here.")
            return

        q = dict(urllib.parse.parse_qsl(parsed.query))

        if not valid_hmac(parsed.query):
            self._reply(400, "Rejected: HMAC did not verify.")
            print("REJECTED — HMAC mismatch. Nothing exchanged.")
            Handler.done = True
            return

        if q.get("state") != STATE:
            self._reply(400, "Rejected: state mismatch.")
            print("REJECTED — state mismatch (possible CSRF). Nothing exchanged.")
            Handler.done = True
            return

        shop = q.get("shop", "")
        if not re.fullmatch(r"[a-zA-Z0-9][\w.-]*\.myshopify\.com", shop):
            self._reply(400, "Rejected: bad shop domain.")
            Handler.done = True
            return

        body = json.dumps({
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": q.get("code", ""),
        }).encode()
        req = urllib.request.Request(
            f"https://{shop}/admin/oauth/access_token", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read())
        except Exception as e:                     # noqa: BLE001
            self._reply(502, "Token exchange failed — see the terminal.")
            print(f"EXCHANGE FAILED: {e}")
            Handler.done = True
            return

        tok = data.get("access_token", "")
        if not tok:
            self._reply(502, "No access_token in response.")
            print("EXCHANGE FAILED: no access_token field")
            Handler.done = True
            return

        write_env(tok)
        self._reply(200, "Token captured. You can close this tab.")
        print(f"\nCAPTURED. Written to {ENV} as {VAR}")
        print(f"  fingerprint : {tok[:6]}…{tok[-4:]}  (len {len(tok)})")
        print(f"  granted     : {data.get('scope', '?')}")
        print("  file mode   : 600")
        Handler.done = True


def main():
    url = (f"https://{SHOP}/admin/oauth/authorize?"
           + urllib.parse.urlencode({
               "client_id": CLIENT_ID,
               "scope": SCOPES,
               "redirect_uri": REDIRECT,
               "state": STATE,
           }))
    print("Listening on", REDIRECT)
    print("\nOpen this URL in the browser where you are logged into the store:\n")
    print(url)
    print("\nWaiting for the redirect… (Ctrl-C to abort)\n")

    srv = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    while not Handler.done:
        srv.handle_request()
    srv.server_close()


if __name__ == "__main__":
    main()
