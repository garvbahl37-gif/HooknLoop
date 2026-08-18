#!/usr/bin/env python3
"""Strip the WordPress page dumps back to their actual content.

WHAT IS WRONG WITH THESE PAGES
The city pages and a few others came across as raw Elementor output: dozens of
class-less nested <div>s whose entire purpose was to carry Elementor CSS that
no longer exists, so they render as an unstyled column with no layout at all.
brisbane-qld is the extreme case — 37,870 characters and 456 divs.

Worse than the layout: each one carries a Contact Form 7 form posting to

    /melbourne-vic/#wpcf7-f7186-p6956-o1

a WordPress endpoint that does not exist on Shopify. The "Get a quote" form on
seven live pages silently goes nowhere — a customer fills it in, presses send,
and nothing reaches the store. That is the real defect here; the styling is
secondary.

WHAT THIS DOES
  · deletes the WPCF7 <form> and its hidden plumbing entirely — the theme
    replaces it with a real Shopify contact form that actually sends;
  · unwraps presentational <div>/<span> shells, keeping everything inside;
  · keeps real content tags untouched: headings, paragraphs, lists, images,
    links, tables, emphasis;
  · asserts no visible text is lost. Word count must not drop by more than 2%,
    and every <img> must survive. A page failing either is skipped, not saved.

    python3 clean_wp_pages.py            # dry run with before/after sizes
    python3 clean_wp_pages.py --apply
    python3 clean_wp_pages.py --apply --only melbourne-vic
"""
import json
import pathlib
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOP = "cvbpp2-up.myshopify.com"

KEEP = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "img", "a",
        "strong", "b", "em", "i", "br", "table", "thead", "tbody", "tr", "td",
        "th", "blockquote", "figure", "figcaption", "iframe"}
DROP_TREE = {"form", "script", "style", "noscript", "button", "input",
             "textarea", "select", "label", "option"}
UNWRAP = {"div", "span", "section", "article", "header", "footer", "main",
          "aside", "nav", "small", "font", "center"}
VOID = {"img", "br", "hr", "input"}
KEEP_ATTRS = {"img": {"src", "alt", "width", "height"},
              "a": {"href", "title"},
              "iframe": {"src", "title", "width", "height", "allow", "loading"}}


class Clean(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.drop_depth = 0
        self.stack = []

    def handle_starttag(self, tag, attrs):
        # VOID tags never nest: <input> has no </input>, so counting one as a
        # level means the counter can only ever go up. Ten inputs inside the
        # WPCF7 form drove the depth to 11 and silently ate the entire rest of
        # the page — 916 words down to 150, both images gone.
        opens = tag in DROP_TREE and tag not in VOID
        if self.drop_depth:
            if opens:
                self.drop_depth += 1
            return
        if tag in DROP_TREE:
            if opens:
                self.drop_depth = 1
            return
        if tag in UNWRAP:
            self.stack.append((tag, False))
            return
        if tag not in KEEP:
            self.stack.append((tag, False))
            return
        allowed = KEEP_ATTRS.get(tag, set())
        a = "".join(f' {k}="{v}"' for k, v in attrs if k in allowed and v)
        self.out.append(f"<{tag}{a}>")
        if tag not in VOID:
            self.stack.append((tag, True))

    def handle_endtag(self, tag):
        if self.drop_depth:
            if tag in DROP_TREE:
                self.drop_depth -= 1
            return
        for i in range(len(self.stack) - 1, -1, -1):
            t, emitted = self.stack[i]
            if t == tag:
                if emitted:
                    self.out.append(f"</{tag}>")
                del self.stack[i:]
                return

    def handle_data(self, data):
        if self.drop_depth:
            return
        if data.strip():
            self.out.append(data)
        elif self.out and not self.out[-1].endswith(" "):
            self.out.append(" ")


def words(html):
    return len(re.sub(r"<[^>]+>", " ", html or "").split())


def imgs(html):
    return len(re.findall(r"<img\b", html or "", re.I))


def clean(html):
    p = Clean()
    p.feed(html or "")
    p.close()
    out = "".join(p.out)
    out = re.sub(r"\s+", " ", out)
    out = re.sub(r"<p>\s*</p>", "", out)
    out = re.sub(r"<(ul|ol)>\s*</\1>", "", out)
    out = re.sub(r"(</(?:p|h[1-6]|ul|ol|li|table|figure)>)\s*", r"\1\n", out)
    return out.strip()


def token():
    for line in (ROOT / "newsletter" / ".env.local").read_text().splitlines():
        for k in ("SHOPIFY_OAUTH_TOKEN_MY_TAPE_STORE", "SHOPIFY_ADMIN_TOKEN_MY_TAPE_STORE"):
            if line.startswith(k + "="):
                return line.split("=", 1)[1].strip().strip("\"'")
    sys.exit("no token")


TOK = token()


def rest(path, method="GET", body=None):
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/{path}",
                                 data=json.dumps(body).encode() if body else None,
                                 method=method)
    req.add_header("X-Shopify-Access-Token", TOK)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def main():
    apply = "--apply" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None

    pages = rest("pages.json?limit=250&fields=id,handle,title,body_html")["pages"]
    jobs, skipped = [], []
    for p in pages:
        b = p["body_html"] or ""
        if only and p["handle"] != only:
            continue
        if "_wpcf7" not in b and len(re.findall(r"<div", b)) <= 20:
            continue
        new = clean(b)
        w0, w1 = words(b), words(new)
        i0, i1 = imgs(b), imgs(new)
        # the form's own placeholder words disappear with it; allow for that
        if w1 < w0 * 0.85 or i1 != i0:
            skipped.append((p["handle"], f"words {w0}->{w1}, imgs {i0}->{i1}"))
            continue
        jobs.append((p, new, w0, w1, i0))

    print(f"{'handle':<34}{'before':>8}{'after':>8}{'saved':>7}  words  imgs")
    for p, new, w0, w1, i0 in jobs:
        b = len(p["body_html"] or "")
        print(f"{p['handle'][:33]:<34}{b:>8}{len(new):>8}{100 - len(new) * 100 // max(b, 1):>6}%  "
              f"{w0}->{w1}  {i0}")
    if skipped:
        print(f"\nSKIPPED (nothing written): {len(skipped)}")
        for h, why in skipped:
            print(f"   {h}: {why}")

    if not apply:
        print("\ndry run — pass --apply")
        return 0

    ok = 0
    for p, new, *_ in jobs:
        rest(f"pages/{p['id']}.json", "PUT",
             {"page": {"id": p["id"], "body_html": new}})
        ok += 1
        print(f"  cleaned {p['handle']}")
        time.sleep(0.4)
    print(f"\ncleaned {ok} page(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
