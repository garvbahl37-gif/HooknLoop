#!/usr/bin/env python3
"""Render the handover Markdown as printable PDFs.

    python3 scripts/md-to-pdf.py build/release/README-FOR-DEVELOPER.md [more.md ...]

WHY IT IS WRITTEN OUT RATHER THAN INSTALLED

No pandoc, no weasyprint, no python-markdown on this machine, and adding a
toolchain to a handover step means the next person needs it too. Chrome is
already here for the screenshot checks and prints PDF natively, so the only
missing piece is Markdown -> HTML, and these two documents use a small, known
subset of Markdown. A focused converter for that subset is smaller than the
dependency it replaces.

Handles: headings, bold/italic/inline code, fenced code blocks, tables,
blockquotes, ordered and unordered lists, links, horizontal rules.
"""

from __future__ import annotations

import html
import pathlib
import re
import subprocess
import sys

CHROME = pathlib.Path.home() / (
    "Library/Caches/ms-playwright/chromium_headless_shell-1234"
    "/chrome-headless-shell-mac-arm64/chrome-headless-shell"
)

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body {
  font: 10.5pt/1.6 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  color: #1f1f1f; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h1 {
  font-size: 21pt; line-height: 1.25; margin: 0 0 14pt; padding-bottom: 7pt;
  border-bottom: 2.5pt solid #df3c22; letter-spacing: -.01em;
}
h1 + p { margin-top: 0; }
h2 {
  font-size: 14.5pt; margin: 20pt 0 8pt; padding-bottom: 4pt;
  border-bottom: .75pt solid #e3e1dd; letter-spacing: -.005em;
  break-after: avoid; page-break-after: avoid;
}
h3 { font-size: 11.8pt; margin: 14pt 0 5pt; break-after: avoid; page-break-after: avoid; }
h4 { font-size: 10.5pt; margin: 12pt 0 4pt; color: #333; break-after: avoid; }
p, ul, ol { margin: 0 0 8pt; }
li { margin: 0 0 3pt; }
ul, ol { padding-left: 17pt; }
a { color: #b62f18; text-decoration: none; word-break: break-word; }
strong { font-weight: 650; }
code {
  font: 9pt/1.45 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  background: #f2eee8; padding: 1pt 3.5pt; border-radius: 3px;
  border: .5pt solid #e3e1dd; word-break: break-word;
}
pre {
  background: #f7f5f2; border: .75pt solid #e3e1dd; border-left: 2.5pt solid #d3cfc9;
  border-radius: 5px; padding: 8pt 10pt; margin: 0 0 10pt; overflow-x: auto;
  break-inside: avoid; page-break-inside: avoid;
}
pre code { background: none; border: 0; padding: 0; font-size: 8.6pt; white-space: pre-wrap; }
blockquote {
  margin: 0 0 10pt; padding: 6pt 12pt; background: #faf8f5;
  border-left: 2.5pt solid #df3c22; border-radius: 0 4px 4px 0;
}
blockquote p:last-child { margin-bottom: 0; }
table {
  width: 100%; border-collapse: collapse; margin: 0 0 11pt; font-size: 9.4pt;
  break-inside: avoid; page-break-inside: avoid;
}
th, td { border: .75pt solid #ddd9d3; padding: 5pt 7pt; text-align: left; vertical-align: top; }
th { background: #f2eee8; font-weight: 650; }
tr:nth-child(even) td { background: #fbfaf8; }
hr { border: 0; border-top: .75pt solid #e3e1dd; margin: 16pt 0; }
"""

INLINE = (
    (re.compile(r"`([^`]+)`"), lambda m: f"<code>{html.escape(m.group(1))}</code>"),
    (re.compile(r"\*\*([^*]+)\*\*"), r"<strong>\1</strong>"),
    (re.compile(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])"), r"<em>\1</em>"),
    (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<a href="\2">\1</a>'),
    (re.compile(r"<(https?://[^>]+)>"), r'<a href="\1">\1</a>'),
)


def inline(text: str) -> str:
    """Escape, then re-apply the inline markup. Code spans are protected first."""
    spans: list[str] = []

    def stash(m: re.Match) -> str:
        spans.append(html.escape(m.group(1)))
        return f"\x00{len(spans) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash, text)
    text = html.escape(text, quote=False)

    for pattern, repl in INLINE[1:]:
        text = pattern.sub(repl, text)

    return re.sub(r"\x00(\d+)\x00", lambda m: f"<code>{spans[int(m.group(1))]}</code>", text)


def convert(md: str) -> str:
    out: list[str] = []
    lines = md.split("\n")
    i = 0
    list_stack: list[str] = []

    def close_lists() -> None:
        while list_stack:
            out.append(f"</{list_stack.pop()}>")

    while i < len(lines):
        line = lines[i]

        # fenced code
        if line.startswith("```"):
            close_lists()
            i += 1
            body = []
            while i < len(lines) and not lines[i].startswith("```"):
                body.append(lines[i])
                i += 1
            i += 1
            out.append("<pre><code>" + html.escape("\n".join(body)) + "</code></pre>")
            continue

        # table
        if "|" in line and i + 1 < len(lines) and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", lines[i + 1]):
            close_lists()
            head = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>")
            for r in rows:
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            out.append("</tbody></table>")
            continue

        # heading
        if m := re.match(r"^(#{1,6})\s+(.*)$", line):
            close_lists()
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
            continue

        # hr
        if re.match(r"^\s*(-{3,}|\*{3,}|_{3,})\s*$", line):
            close_lists()
            out.append("<hr>")
            i += 1
            continue

        # blockquote (consume the run)
        if line.lstrip().startswith(">"):
            close_lists()
            body = []
            while i < len(lines) and lines[i].lstrip().startswith(">"):
                body.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + convert("\n".join(body)) + "</blockquote>")
            continue

        # list items
        if m := re.match(r"^(\s*)([-*+]|\d+\.)\s+(.*)$", line):
            indent, marker, text = len(m.group(1)), m.group(2), m.group(3)
            tag = "ol" if marker[0].isdigit() else "ul"
            depth = indent // 2

            while len(list_stack) > depth + 1:
                out.append(f"</{list_stack.pop()}>")
            if len(list_stack) < depth + 1:
                out.append(f"<{tag}>")
                list_stack.append(tag)

            # continuation lines belong to this item
            i += 1
            while i < len(lines) and lines[i].strip() and not re.match(
                r"^(\s*)([-*+]|\d+\.)\s+|^#{1,6}\s|^```|^\s*>", lines[i]
            ) and (len(lines[i]) - len(lines[i].lstrip())) > indent:
                text += " " + lines[i].strip()
                i += 1

            out.append(f"<li>{inline(text)}</li>")
            continue

        if not line.strip():
            close_lists()
            i += 1
            continue

        # paragraph (consume the run)
        close_lists()
        body = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+\.)\s|\s*(-{3,}|\*{3,})\s*$)", lines[i]
        ) and "|" not in lines[i]:
            body.append(lines[i])
            i += 1
        out.append(f"<p>{inline(' '.join(body))}</p>")

    close_lists()
    return "\n".join(out)


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    if not CHROME.is_file():
        sys.exit(f"chrome not found at {CHROME}")

    for arg in sys.argv[1:]:
        src = pathlib.Path(arg).resolve()
        if not src.is_file():
            print(f"  missing: {src}")
            continue

        title = src.stem.replace("-", " ").title()
        body = convert(src.read_text(encoding="utf-8"))
        page = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            f"<title>{html.escape(title)}</title><style>{CSS}</style></head>"
            f"<body>{body}</body></html>"
        )

        tmp = src.with_suffix(".pdf.html")
        tmp.write_text(page, encoding="utf-8")

        pdf = src.with_suffix(".pdf")
        subprocess.run(
            [
                str(CHROME), "--headless", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={pdf}", "--virtual-time-budget=6000", tmp.as_uri(),
            ],
            check=True, capture_output=True,
        )
        tmp.unlink(missing_ok=True)

        print(f"  {pdf.name:<34} {pdf.stat().st_size / 1024:>6.0f} KB")

    return 0


if __name__ == "__main__":
    sys.exit(main())
