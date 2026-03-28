"""
Cross-check Chalk River CT Calculator.xlsx against the calculator in operator-guide.html (#ct-calculator).

Run from repo root:
  python scripts/verify_excel_parity.py

Requires: openpyxl
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Install openpyxl: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "Chalk River CT Calculator.xlsx"


def must_contain(formula: str, *needles: str) -> None:
    f = (formula or "").replace(" ", "").replace("$", "")
    for n in needles:
        nn = n.replace(" ", "").replace("$", "")
        if nn not in f:
            raise AssertionError(f"Expected {needles!r} in formula, got:\n  {formula!r}")


def main() -> int:
    if not PATH.is_file():
        print(f"Missing workbook: {PATH}", file=sys.stderr)
        return 1

    wb = openpyxl.load_workbook(PATH, data_only=False)
    calc = wb["Calculations"]

    checks = [
        ("C8", ["I23", "W7", "/100"]),
        ("D8", ["MAX", "Y7", "P11"]),
        ("E8", ["C8", "D8", "1000", "/60"]),
        ("F9", None),  # constant 1
        ("N8", ["VLOOKUP", "K8", "Giardia CT", "S$4:$X$18", "2*I8-12"]),
        ("P8", ["0.2828", "H8^2.69", "J8^0.15", "0.933^", "L8-5"]),
        ("Q8", ["MAX", "O8", "P8"]),
        ("R8", ["VLOOKUP", "M8", "Virus CT", "H$6:$I$11"]),
        ("C9", ["$I$24"]),
        ("D9", ["P11"]),
        ("C10", ["I25", "L7", "/100", "+300"]),
        ("D10", ["MAX", "P11", "B14"]),
        ("C24", ["SUM", "Q8:Q10"]),
        ("D24", ["SUM", "U8:U10"]),
        ("C26", ["J8*G8", "J9*G9", "J10*G10"]),
        ("C27", ["C26", "P20", "C24"]),
        ("D27", ["D26", "P21", "D24"]),
    ]

    for coord, needles in checks:
        cell = calc[coord]
        v = cell.value
        if needles is None:
            if v != 1:
                raise AssertionError(f"{coord}: expected constant 1, got {v!r}")
            continue
        if not isinstance(v, str) or not v.startswith("="):
            raise AssertionError(f"{coord}: expected formula, got {v!r}")
        must_contain(v, *needles)

    wb.close()
    print("OK: Calculations sheet formulas match expected patterns (rows 8-10, 24-27).")
    print("Note: Giardia N uses Giardia CT $S$4:$X$18 only (0.5 C k); web app uses k[0] per block.")
    print("Note: C10 uses +300 in Excel; HTML uses editable V_extra default 300.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
