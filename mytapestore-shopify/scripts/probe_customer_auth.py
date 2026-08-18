#!/usr/bin/env python3
"""Answer one question: can this store support a custom, theme-hosted login?

Run it and read the verdict at the bottom. Nothing is written to the store; the
only side effect is minting a Storefront access token (a read credential the
theme would need anyway) and saving it to newsletter/.env.local.

WHY A PROBE RATHER THAN JUST BUILDING THE PAGE
A themed sign-in form needs some API that will verify an email + password and
hand back a session. On the Storefront API that is `customerAccessTokenCreate`.
Two things can make it unusable, and both are invisible until you check:

  1. Shopify has been sunsetting the legacy Storefront customer mutations in
     favour of the OAuth-based Customer Account API. If the mutation is gone
     from the schema, there is nothing to call.

  2. This store runs NEW customer accounts, which are PASSWORDLESS — customers
     sign in with a one-time email code. If no customer has a password, then
     even a present mutation has nothing to verify, and the login form would
     be a shell: it renders, it posts, it can never succeed.

Whatever the outcome, note the separate limitation the probe cannot test:
a Storefront customer access token does NOT log the shopper into Shopify's
checkout. They would appear signed in on the storefront and still be a guest at
checkout, with no saved addresses and no order history there.

    python3 probe_customer_auth.py
"""
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENV = ROOT / "newsletter" / ".env.local"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
SF_VAR = "SHOPIFY_STOREFRONT_TOKEN_MY_TAPE_STORE"


def env_val(key):
    if not ENV.exists():
        return None
    for line in ENV.read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


def write_env(var, val):
    txt = ENV.read_text()
    if re.search(rf"^{var}=.*$", txt, re.M):
        txt = re.sub(rf"^{var}=.*$", f"{var}={val}", txt, flags=re.M)
    else:
        txt = txt.rstrip("\n") + f"\n{var}={val}\n"
    ENV.write_text(txt)
    os.chmod(ENV, 0o600)


def admin_gql(token, query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/{API}/graphql.json", data=body, method="POST")
    req.add_header("X-Shopify-Access-Token", token)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def storefront_gql(token, query):
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        f"https://{SHOP}/api/{API}/graphql.json", data=body, method="POST")
    req.add_header("X-Shopify-Storefront-Access-Token", token)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def main():
    tok = (os.environ.get("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE")
           or env_val("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE")
           or env_val("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE"))
    if not tok:
        sys.exit("no admin/oauth token in newsletter/.env.local")

    print("=" * 66)
    print("STEP 1  admin token")
    try:
        shop = admin_gql(tok, "{ shop { name myshopifyDomain "
                              "customerAccountsV2 { customerAccountsVersion } } }")
        s = shop["data"]["shop"]
        ver = s["customerAccountsV2"]["customerAccountsVersion"]
        print(f"  ok — {s['name']} ({s['myshopifyDomain']})")
        print(f"  customer accounts version : {ver}")
    except urllib.error.HTTPError as e:
        sys.exit(f"  admin token rejected: HTTP {e.code}")

    print("\nSTEP 2  storefront access token")
    sf = env_val(SF_VAR)
    if sf:
        print("  reusing the one already in .env.local")
    else:
        r = admin_gql(tok, """
            mutation { storefrontAccessTokenCreate(input:
              {title: "mts-theme-auth"}) {
                storefrontAccessToken { accessToken }
                userErrors { field message }
              } }""")
        node = (r.get("data") or {}).get("storefrontAccessTokenCreate") or {}
        errs = node.get("userErrors") or r.get("errors")
        if errs or not node.get("storefrontAccessToken"):
            print(f"  FAILED: {json.dumps(errs)[:300]}")
            print("\n  The app still is not 'extendable'. It needs the")
            print("  unauthenticated_read_customers / unauthenticated_write_customers")
            print("  scopes granted at install time.")
            sys.exit(1)
        sf = node["storefrontAccessToken"]["accessToken"]
        write_env(SF_VAR, sf)
        print(f"  minted and saved as {SF_VAR}")
        print(f"  fingerprint: {sf[:6]}…{sf[-4:]}")

    print("\nSTEP 3  does the Storefront API still offer password login?")
    r = storefront_gql(sf, "{ __schema { mutationType { fields { name } } } }")
    if "errors" in r:
        sys.exit(f"  storefront query failed: {json.dumps(r['errors'])[:300]}")
    fields = [f["name"] for f in r["data"]["__schema"]["mutationType"]["fields"]]
    wanted = ["customerAccessTokenCreate", "customerCreate",
              "customerRecover", "customerAccessTokenRenew"]
    present = {w: (w in fields) for w in wanted}
    for k, v in present.items():
        print(f"  {k:<28} {'AVAILABLE' if v else 'GONE'}")

    print("\n" + "=" * 66)
    print("VERDICT")
    if not present["customerAccessTokenCreate"]:
        print("  NO — the password-login mutation is not in this store's schema.")
        print("  A themed sign-in form has nothing to authenticate against.")
    elif ver == "NEW_CUSTOMER_ACCOUNTS":
        print("  MUTATION EXISTS, BUT the store is on NEW (passwordless) accounts.")
        print("  Customers sign in with an emailed code and have no password, so")
        print("  the mutation will reject every real customer. Confirm by trying")
        print("  a genuine email + password before any UI is built on it.")
    else:
        print("  YES — classic accounts + the mutation is present. A themed")
        print("  login is buildable.")
    print("\n  Regardless of the above: a Storefront customer token does NOT")
    print("  sign the shopper into CHECKOUT. They would be a guest there, with")
    print("  no saved addresses and no order history.")
    print("=" * 66)


if __name__ == "__main__":
    main()
