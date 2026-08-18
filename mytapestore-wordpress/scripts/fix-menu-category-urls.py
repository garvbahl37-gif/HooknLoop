#!/usr/bin/env python3
"""Repoint hardcoded menu URLs at the live URL scheme.

Eight menu items store an absolute `_menu_item_url` built when categories lived
at /product-category/<slug>/. They still work — inc/permalinks.php 301s the old
form — but a redirect on a primary navigation link costs a round-trip on every
page that renders the menu, and it puts a redirecting URL in the markup search
engines crawl.

The replacement is not a string swap: a child term's live URL includes its
parent, so /product-category/aerospace-defense/ becomes /industry/aerospace-defense/
while /product-category/duct-tape/ becomes /duct-tape/. The hierarchy is read
from the terms tables to get each one right.
"""
import pathlib, re, sqlite3, sys

DB = pathlib.Path(__file__).resolve().parent.parent / "local/wordpress/wp-content/database/.ht.sqlite"
commit = "--commit" in sys.argv

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row

terms = {}
for r in con.execute("""SELECT t.term_id, t.slug, tt.parent
                        FROM wp_terms t JOIN wp_term_taxonomy tt ON tt.term_id=t.term_id
                        WHERE tt.taxonomy='product_cat'"""):
    terms[r["term_id"]] = {"slug": r["slug"], "parent": r["parent"]}
by_slug = {v["slug"]: k for k, v in terms.items()}

def path_for(slug):
    tid = by_slug.get(slug)
    if tid is None:
        return None
    parts, guard = [], 0
    while tid and guard < 10:
        parts.insert(0, terms[tid]["slug"])
        tid = terms[tid]["parent"]
        guard += 1
    return "/" + "/".join(parts) + "/"

rows = con.execute("""SELECT meta_id, post_id, meta_value FROM wp_postmeta
                      WHERE meta_key='_menu_item_url' AND meta_value LIKE '%product-category%'""").fetchall()

print(f"menu items with an old category URL: {len(rows)}\n")
changed = 0
for r in rows:
    m = re.search(r'/product-category/([^/]+)/?$', r["meta_value"])
    if not m:
        print(f"  SKIP  {r['meta_value']}  (unrecognised shape)")
        continue
    new_path = path_for(m.group(1))
    if not new_path:
        print(f"  SKIP  {r['meta_value']}  (no such category)")
        continue
    new_url = re.sub(r'/product-category/[^/]+/?$', new_path, r["meta_value"])
    print(f"  {r['meta_value']}\n    -> {new_url}")
    if commit:
        con.execute("UPDATE wp_postmeta SET meta_value=? WHERE meta_id=?", (new_url, r["meta_id"]))
    changed += 1

if commit:
    con.commit()
print(f"\n{changed} item(s) " + ("updated." if commit else "would change — pass --commit."))
