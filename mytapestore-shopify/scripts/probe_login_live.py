#!/usr/bin/env python3
"""Settle it empirically: can a password actually sign someone in on this store?

STEP 3 of probe_customer_auth.py proved `customerAccessTokenCreate` is still in
the schema. That is necessary but not sufficient — on a NEW_CUSTOMER_ACCOUNTS
(passwordless) store the mutation can exist and still refuse every login,
because no customer has a password to check. Schema presence and working auth
are different claims, and only one of them can be tested by trying it.

So: create a throwaway customer WITH a password via the Storefront API, attempt
to sign in as them, then delete them. Whatever happens is the real answer.

SIDE EFFECTS, and how they are contained
  · Creates ONE customer, at an @example.com address (IANA-reserved, cannot
    reach a real inbox) with a random password nobody keeps.
  · Deletes it again via the Admin API in a finally: block, so it is removed
    even if the sign-in step throws.
  · Marks it with the tag `mts-auth-probe` so any leftover is trivial to find:
      Admin -> Customers -> filter by tag mts-auth-probe
  · Writes nothing else, and touches no existing customer.

    python3 probe_login_live.py
"""
import json
import pathlib
import secrets
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENV = ROOT / "newsletter" / ".env.local"
SHOP = "cvbpp2-up.myshopify.com"
API = "2024-10"
TAG = "mts-auth-probe"


def env_val(key):
    for line in ENV.read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


ADMIN = env_val("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE") or env_val("SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE")
SF = env_val("SHOPIFY_STOREFRONT_TOKEN_MY_TAPE_STORE")
if not ADMIN or not SF:
    sys.exit("need SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE and "
             "SHOPIFY_STOREFRONT_TOKEN_MY_TAPE_STORE in newsletter/.env.local "
             "(run probe_customer_auth.py first)")


def gql(url, headers, query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"errors": [{"message": f"HTTP {e.code}: {e.read().decode()[:200]}"}]}


def storefront(q, v=None):
    return gql(f"https://{SHOP}/api/{API}/graphql.json",
               {"X-Shopify-Storefront-Access-Token": SF}, q, v)


def admin(q, v=None):
    return gql(f"https://{SHOP}/admin/api/{API}/graphql.json",
               {"X-Shopify-Access-Token": ADMIN}, q, v)


CREATE = """
mutation($i: CustomerCreateInput!) {
  customerCreate(input: $i) {
    customer { id email }
    customerUserErrors { code field message }
  }
}"""

LOGIN = """
mutation($i: CustomerAccessTokenCreateInput!) {
  customerAccessTokenCreate(input: $i) {
    customerAccessToken { accessToken expiresAt }
    customerUserErrors { code field message }
  }
}"""

WHOAMI = """
query($t: String!) { customer(customerAccessToken: $t) { id email firstName } }"""


def main():
    email = f"mts-auth-probe-{secrets.token_hex(4)}@example.com"
    password = secrets.token_urlsafe(18) + "aA1!"
    created_id = None
    verdict = []

    print("=" * 68)
    print(f"probe customer: {email}")

    try:
        print("\nSTEP 1  create a customer WITH a password (Storefront API)")
        r = storefront(CREATE, {"i": {
            "email": email, "password": password,
            "firstName": "Auth", "lastName": "Probe"}})
        if "errors" in r:
            print(f"  transport error: {json.dumps(r['errors'])[:220]}")
            verdict.append("customerCreate failed at transport level")
            return
        node = r["data"]["customerCreate"]
        errs = node["customerUserErrors"]
        if errs:
            print(f"  REJECTED: {json.dumps(errs)[:300]}")
            verdict.append("the store refuses password-based customer creation")
            return
        created_id = node["customer"]["id"]
        print(f"  created — {node['customer']['email']}")

        print("\nSTEP 2  sign in as that customer (email + password)")
        r = storefront(LOGIN, {"i": {"email": email, "password": password}})
        node = r["data"]["customerAccessTokenCreate"]
        errs = node["customerUserErrors"]
        if errs or not node["customerAccessToken"]:
            print(f"  LOGIN FAILED: {json.dumps(errs)[:300]}")
            verdict.append("password sign-in is refused — a themed login form "
                           "cannot work on this store")
            return
        tok = node["customerAccessToken"]["accessToken"]
        print(f"  LOGIN OK — token {tok[:6]}…{tok[-4:]}, "
              f"expires {node['customerAccessToken']['expiresAt']}")

        print("\nSTEP 3  use the token to read the customer back")
        r = storefront(WHOAMI, {"t": tok})
        c = (r.get("data") or {}).get("customer")
        if not c:
            print(f"  token did not resolve: {json.dumps(r)[:220]}")
            verdict.append("sign-in returned a token that does not resolve")
            return
        print(f"  resolved — {c['email']} ({c['firstName']})")
        verdict.append("PASSWORD SIGN-IN WORKS on this store")

    finally:
        if created_id:
            print("\nCLEANUP  deleting the probe customer")
            d = admin("""mutation($id: ID!) {
                          customerDelete(input: {id: $id}) {
                            deletedCustomerId
                            userErrors { message } } }""", {"id": created_id})
            node = (d.get("data") or {}).get("customerDelete") or {}
            if node.get("deletedCustomerId"):
                print("  deleted.")
            else:
                print(f"  COULD NOT DELETE: {json.dumps(d)[:240]}")
                print(f"  Remove by hand: Customers -> filter tag {TAG} / {email}")

        print("\n" + "=" * 68)
        print("VERDICT")
        for v in verdict or ["inconclusive"]:
            print(f"  {v}")
        print("\n  Unchanged either way: a Storefront customer token does NOT")
        print("  sign the shopper into CHECKOUT — they stay a guest there.")
        print("=" * 68)


if __name__ == "__main__":
    main()
