"""Embed ct-calculator into operator-guide.html (section + modal + scripts)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
calc_path = ROOT / "ct-calculator.html"
guide_path = ROOT / "operator-guide.html"

calc = calc_path.read_text(encoding="utf-8")
body_start = calc.index("<body>") + len("<body>")
body_end = calc.rindex("</body>")
body = calc[body_start:body_end]

SPLIT = "\n\n  <div\n    id=\"formulaModal\""
if SPLIT not in body:
    raise SystemExit("split marker not found in ct-calculator body")

before, after = body.split(SPLIT, 1)
modal = "      <div\n    id=\"formulaModal\"" + after

scripts_split = '<script src="ct-tables.js"></script>'
if scripts_split not in modal:
    raise SystemExit("ct-tables script not found after modal")
modal_html, scripts_part = modal.split(scripts_split, 1)
scripts_block = scripts_split + scripts_part.strip() + "\n"

# unwrap wrap -> section + ct-inner; close inner before modal
main = before.replace(
    "  <div class=\"wrap\">",
    '    <section id="ct-calculator" class="ct-tool" aria-label="Chlorine contact calculator">\n'
    '      <div class="ct-inner">',
    1,
)
parts = main.rsplit("\n  </div>", 1)
if len(parts) != 2:
    raise SystemExit("could not find closing wrap </div>")
main = parts[0] + "\n      </div>\n\n"

main = main.replace(
    'href="operator-guide.html" class="btn-link">← Operator guide</a>',
    'href="#quick-facts" class="btn-link">↑ Start here</a>',
)
main = main.replace('href="operator-guide.html#', 'href="#')

# modal ends with </div> for overlay; add </section>
modal_html = modal_html.rstrip()
if not modal_html.endswith("</div>"):
    raise SystemExit("modal markup unexpected")
embedded = main + modal_html + "\n    </section>\n\n"


def add_base_indent(block: str, spaces: int) -> str:
    pad = " " * spaces
    lines = []
    for line in block.split("\n"):
        if line.strip():
            lines.append(pad + line)
        else:
            lines.append("")
    return "\n".join(lines)


embedded = add_base_indent(embedded, 2)
scripts_block_indented = add_base_indent(scripts_block, 2)

MARKER = "    </section>\n\n    <section id=\"history-briefing\">"
guide = guide_path.read_text(encoding="utf-8")
if MARKER not in guide:
    raise SystemExit("marker not found")
if 'id="ct-calculator"' in guide:
    raise SystemExit("already merged")

guide = guide.replace(
    MARKER,
    "    </section>\n\n" + embedded + "\n    <section id=\"history-briefing\">",
    1,
)

LIGHTBOX_END = '  </div>\n\n  <script>\n    document.querySelectorAll(".js-print")'
if LIGHTBOX_END not in guide:
    raise SystemExit("lightbox anchor not found")
guide = guide.replace(
    LIGHTBOX_END,
    "  </div>\n\n" + scripts_block_indented + "\n  <script>\n    document.querySelectorAll(\".js-print\")",
    1,
)

guide_path.write_text(guide, encoding="utf-8", newline="\n")
print("OK: operator-guide.html merged")
