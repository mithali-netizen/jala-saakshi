"""
Extract KSPCB water-quality reports (2018-2026) into one tidy CSV.

    python3 kspcb.py *.pdf                      -> readings.csv
    python3 kspcb.py data/*.pdf --out all.csv

Handles BOTH published layouts and picks the right one per file:

  NEW (2026-style, "...for the month of August 2026")
      One row per station, one month per file. 14 columns, header repeated
      on every page. Has STN Code and Use Based Class.
      Coliform order: Total, then Fecal.

  OLD (2018-style, "...during the year 2018-19")
      One row per station, THREE months spread across columns. 16 columns.
      Header appears ONLY on page 1 - later pages continue the same table
      with no header, so the header is carried across pages or those pages
      are silently lost. No station code, no use class.
      Coliform order: Fecal, then Total  <- reversed vs the new format.

Both are written to the same columns, so the output concatenates cleanly
across years. Values that mean "no number": "-", "*", "NA" become empty.
"BDL" (below detection limit) is kept as-is - it is a real result.
"""

import argparse
import csv
import re
import sys
from pathlib import Path

import pdfplumber

FIELDS = [
    "month", "year", "stn_code", "river", "lab", "district",
    "location", "stretch", "use_class",
    "do_mg_l", "bod_mg_l", "total_coliform", "fecal_coliform", "fecal_strep",
    "source_file", "format",
]

BLANKS = {
    "-", "--", "---", "*", "**", "***",
    "NA", "N/A", "Nil", "NIL", "",
    "\u2015",  # horizontal bar '―'
    "\u2014",  # em dash '—'
    "\u2013",  # en dash '–'
    "\u2026",  # horizontal ellipsis '…'
    "...",
}

MONTHS = {
    "jan": "January", "feb": "February", "mar": "March", "apr": "April",
    "may": "May", "jun": "June", "jul": "July", "aug": "August",
    "sep": "September", "oct": "October", "nov": "November", "dec": "December",
}

# ---------------------------------------------------------------- helpers

def clean(v):
    return "" if v is None else " ".join(str(v).split())


def squash(v):
    return re.sub(r"[^a-z0-9]", "", clean(v).lower())


def num(v):
    s = clean(v)
    if s in BLANKS:
        return ""
    return s.rstrip(".") if re.match(r"^[\d.]+\.$", s) else s


def blank_row():
    return {f: "" for f in FIELDS}


# ------------------------------------------------------- NEW (2026) format

NEW_HEADERS = [
    ("stn_code",       r"stncode"),
    ("river",          r"rivername"),
    ("lab",            r"laborator"),
    ("district",       r"district"),
    ("location",       r"monitoringlocation|nameofmonitoring"),
    ("stretch",        r"stretch"),
    ("use_class",      r"basedclass|useclass"),
    ("do_mg_l",        r"dissolved"),
    ("bod_mg_l",       r"^bod"),
    ("total_coliform", r"totalcoliform"),
    ("fecal_coliform", r"fecalcoliform|faecalcoliform"),
    ("fecal_strep",    r"strepto"),
]

NEW_CARRY = ("river", "lab", "district", "stretch")

TITLE_MONTH = re.compile(r"for the month of\s+([A-Za-z]+)[\s-]+(\d{4})", re.I)

# e.g. "PRS December 2024.pdf", "PRS_Dec-2024.pdf"
FILE_MONTH = re.compile(
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s_.-]*(\d{4})",
    re.I,
)


def month_from_filename(path):
    m = FILE_MONTH.search(path.stem)
    if not m:
        return "", ""
    return MONTHS[m.group(1).lower()], m.group(2)


def new_colmap(table):
    """Map field -> column index from a header row, or None if not a header."""
    for row in table[:4]:
        found = {}
        for idx, cell in enumerate(row):
            s = squash(cell)
            if not s:
                continue
            for field, pat in NEW_HEADERS:
                if field not in found and re.search(pat, s):
                    found[field] = idx
                    break
        if {"stn_code", "do_mg_l", "bod_mg_l"} <= set(found):
            return found
    return None


def parse_new(pdf, path):
    month = year = ""
    for page in pdf.pages:
        m = TITLE_MONTH.search(page.extract_text() or "")
        if m:
            month, year = m.group(1).capitalize(), m.group(2)
            break
    if not month:
        month, year = month_from_filename(path)
        if month:
            print(f"  ~ {path.name}: no month in title, used file name",
                  file=sys.stderr)
        else:
            print(f"  ! {path.name}: no month in title or file name",
                  file=sys.stderr)

    out = []
    carried = {k: "" for k in NEW_CARRY}
    colmap = None

    for page in pdf.pages:
        for table in page.extract_tables():
            found = new_colmap(table)
            if found:
                colmap = found
            if not colmap:
                continue

            width = max(colmap.values()) + 1
            for raw in table:
                if len(raw) < width:
                    continue
                code = clean(raw[colmap["stn_code"]])
                if not code.isdigit():
                    continue

                for k in NEW_CARRY:
                    if k in colmap:
                        v = clean(raw[colmap[k]])
                        if v:
                            carried[k] = v

                # Fallback river detection from location string if river column is empty
                loc_val = clean(raw[colmap["location"]]) if "location" in colmap else ""
                if not clean(raw[colmap.get("river", -1)] if "river" in colmap else "") and loc_val:
                    m_riv = re.match(r"^River\s+([A-Za-z]+)", loc_val, re.I)
                    if m_riv:
                        carried["river"] = m_riv.group(1)

                def get(field):
                    i = colmap.get(field)
                    return clean(raw[i]) if i is not None else ""

                r = blank_row()
                r.update(
                    month=month, year=year, stn_code=code,
                    river=carried["river"], lab=carried["lab"],
                    district=carried["district"], stretch=carried["stretch"],
                    location=get("location"), use_class=get("use_class"),
                    do_mg_l=num(get("do_mg_l")), bod_mg_l=num(get("bod_mg_l")),
                    total_coliform=num(get("total_coliform")),
                    fecal_coliform=num(get("fecal_coliform")),
                    fecal_strep=num(get("fecal_strep")),
                    source_file=path.name, format="new",
                )
                out.append(r)
    return out


# ------------------------------------------------------- OLD (2018) format

OLD_SL, OLD_RIVER, OLD_STRETCH, OLD_LOCATION = range(4)
OLD_FIRST_DATA = 4
OLD_PER_MONTH = 4            # DO, BOD, FC, TC

MONTH_HDR = re.compile(
    r"\b(jan|feb|mar|apr|aprl|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[-\s]*(\d{2,4})\b",
    re.I,
)


def old_months(table):
    """Month labels in column order, e.g. [('April','2018'), ...]."""
    found = []
    for row in table[:4]:
        for cell in row:
            for m in MONTH_HDR.finditer(clean(cell)):
                key = m.group(1).lower()[:3]
                mon = MONTHS.get(key)
                yr = m.group(2)
                yr = f"20{yr}" if len(yr) == 2 else yr
                if mon and (mon, yr) not in found:
                    found.append((mon, yr))
    return found


def parse_old(pdf, path):
    out = []
    months = []
    carried = {OLD_RIVER: "", OLD_STRETCH: ""}

    for page in pdf.pages:
        for table in page.extract_tables():
            found = old_months(table)
            if found:
                months = found
            if not months:
                continue

            for raw in table:
                if len(raw) < OLD_FIRST_DATA + OLD_PER_MONTH:
                    continue
                loc = clean(raw[OLD_LOCATION])
                if not loc or loc.lower().startswith("monitoring") or "designated" in loc.lower() or "class of water" in clean(raw[OLD_SL]).lower():
                    continue

                for i in (OLD_RIVER, OLD_STRETCH):
                    v = clean(raw[i])
                    if v:
                        carried[i] = v

                # Handle Thumbe / Netravathi carry edge-case when river text was cut off across page boundary
                if "thumbe" in loc.lower() and not clean(raw[OLD_RIVER]):
                    carried[OLD_RIVER] = "NETRAVATHI"
                    carried[OLD_STRETCH] = "UPPINANGADI TO MANGALURU"

                for bi, (mon, yr) in enumerate(months):
                    base = OLD_FIRST_DATA + bi * OLD_PER_MONTH
                    if base + 3 >= len(raw):
                        break
                    do, bod, fc, tc = (raw[base + k] for k in range(4))
                    if not any(num(x) for x in (do, bod, fc, tc)):
                        continue        # station not sampled that month

                    r = blank_row()
                    r.update(
                        month=mon, year=yr,
                        river=carried[OLD_RIVER], stretch=carried[OLD_STRETCH],
                        location=loc,
                        do_mg_l=num(do), bod_mg_l=num(bod),
                        total_coliform=num(tc),     # 4th column here
                        fecal_coliform=num(fc),     # 3rd column here
                        source_file=path.name, format="old",
                    )
                    out.append(r)
    return out


# ---------------------------------------------------------------- dispatch

def detect(pdf):
    """Return 'new' or 'old' by looking at the first two pages."""
    for page in pdf.pages[:2]:
        text = page.extract_text() or ""
        if TITLE_MONTH.search(text):
            return "new"
        for table in page.extract_tables():
            if new_colmap(table):
                return "new"
            if old_months(table):
                return "old"
    return "old"


def rows_from(path):
    with pdfplumber.open(path) as pdf:
        kind = detect(pdf)
        return (parse_new if kind == "new" else parse_old)(pdf, path), kind


STATUS_PATTERNS = re.compile(
    r"^(bdl|nw|no\s*water|no\s*flow|results?\s*awaited|awaited|no\s*access|dry|nil|na|p|cov.*|not\s*able.*)$",
    re.I,
)


def check(rows, label):
    """Text where a number belongs means the columns are misaligned."""
    bad = [
        (r["stn_code"] or r["location"][:20], f, r[f])
        for r in rows
        for f in ("do_mg_l", "bod_mg_l")
        if r[f] and not re.match(r"^[\d.]+$", r[f]) and not STATUS_PATTERNS.match(r[f].strip())
    ]
    if bad:
        print(f"  !! {label}: {len(bad)} non-numeric reading(s) - columns look wrong:")
        for who, f, v in bad[:5]:
            try:
                print(f"       {who} {f} = {v!r}")
            except Exception:
                print(f"       {who} {f} = {ascii(v)}")
    return not bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdfs", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path("readings.csv"))
    args = ap.parse_args()

    all_rows = []
    ok = True
    for path in args.pdfs:
        if not path.exists():
            print(f"  ! missing: {path}", file=sys.stderr)
            continue
        rows, kind = rows_from(path)
        months = sorted({(r["year"], r["month"]) for r in rows})
        label = ", ".join(f"{m} {y}" for y, m in months) or "no months found"
        print(f"{path.name}  [{kind}]  {len(rows)} readings  ({label})")
        if not rows:
            print("  ! nothing extracted - check this file by hand", file=sys.stderr)
        ok &= check(rows, path.name)
        all_rows.extend(rows)

    if not all_rows:
        sys.exit("No readings extracted from any file.")

    # Sort chronologically so the CSV reads in order.
    order = {m: i for i, m in enumerate(MONTHS.values(), start=1)}
    all_rows.sort(key=lambda r: (r["year"], order.get(r["month"], 99),
                                 r["river"], r["location"]))

    with args.out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(all_rows)

    periods = sorted({(r["year"], r["month"]) for r in all_rows})
    print(f"\n{len(all_rows)} readings across {len(periods)} month(s) -> {args.out}")
    print(f"  {periods[0][1]} {periods[0][0]}  ...  {periods[-1][1]} {periods[-1][0]}")

    kana = [r for r in all_rows
            if "kanakapura" in r["location"].lower() and "d/s" in r["location"].lower()]
    if kana:
        print("\nArkavathi d/s of Kanakapura:")
        for r in kana:
            cls = f"class {r['use_class']}" if r["use_class"] else ""
            print(f"  {r['month']:<10}{r['year']}   DO {r['do_mg_l']:>5}   "
                  f"BOD {r['bod_mg_l']:>5}   {cls}")

    if not ok:
        print("\nFix the flagged files before building on this CSV.")
        sys.exit(1)


if __name__ == "__main__":
    main()