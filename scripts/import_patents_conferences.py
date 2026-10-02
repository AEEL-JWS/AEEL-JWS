"""Import the user-supplied patents and conferences CMS Import worksheets.

Usage: python scripts/import_patents_conferences.py PATH_TO_WORKBOOK_DIRECTORY
Existing content is never overwritten. The source workbooks remain outside Git.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
WORKBOOKS = Path(sys.argv[1])


def sheet_rows(filename: str, sheet_name: str):
    workbook = load_workbook(WORKBOOKS / filename, read_only=True, data_only=True)
    values = iter(workbook[sheet_name].values)
    next(values)
    return [row for row in values if any(value is not None for value in row)]


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")[:56] or "record"


def write(collection: str, filename: str, fields: dict):
    destination = ROOT / "src" / "content" / collection / filename
    assert not destination.exists(), f"Refusing to overwrite CMS content: {destination}"
    lines = ["---"]
    for key, value in fields.items():
        if value is None or value == "":
            continue
        if isinstance(value, datetime):
            value = value.date().isoformat()
        lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    destination.write_text("\n".join([*lines, "---", ""]), encoding="utf-8")


conference_file = "AEEL_conferences_48_CMS_master.xlsx"
patent_file = "AEEL_patents_40_CMS_master.xlsx"
conferences = sheet_rows(conference_file, "CMS Import")
patents = sheet_rows(patent_file, "CMS Import")
assert len(conferences) == 48 and len(patents) == 40
assert [row[0] for row in conferences] == list(range(1, 49))
assert [row[0] for row in patents] == list(range(1, 41))
assert Counter(row[2] for row in patents) == {"출원": 16, "등록": 24}
reviewed_conferences = sheet_rows(conference_file, "Review Needed")
assert {(row[0], row[1], row[2]) for row in reviewed_conferences} == {(12, 2018, 2019), (13, 2018, 2019), (14, 2018, 2019)}
reviewed_patents = sheet_rows(patent_file, "Review Needed")
assert len(reviewed_patents) == 1 and reviewed_patents[0][0] == 5
assert patents[4][2] == "등록" and patents[4][7] is None and patents[4][8] is None
assert not list((ROOT / "src/content/conferences").glob("*.md"))
assert not list((ROOT / "src/content/patents").glob("*.md"))

for row in conferences:
    order, year, month, event, type_, title, authors, location, country, language, featured, active, source_year, notes = row
    write("conferences", f"{year}-{order:03d}-{slug(event)}.md", {
        "year": year, "month": month, "event": event, "type": type_, "title": title,
        "authors": authors, "location": location, "country": country, "language": language,
        "featured": bool(featured), "active": bool(active), "sourceYear": source_year,
        "notes": notes, "order": order,
    })

for row in patents:
    order, title, status, countries, country_count, application_date, application_number, registration_date, registration_number, inventors, language, area, featured, active, notes = row
    assert country_count >= 1 and isinstance(application_number, str)
    assert registration_number is None or isinstance(registration_number, str)
    write("patents", f"{application_date:%Y}-{order:03d}-{slug(title)}.md", {
        "title": title, "status": status, "applicationCountries": countries,
        "applicationDate": application_date, "applicationNumber": application_number,
        "registrationDate": registration_date, "registrationNumber": registration_number,
        "inventors": inventors, "language": language, "researchArea": area,
        "featured": bool(featured), "active": bool(active), "notes": notes, "order": order,
    })

print(f"Imported {len(conferences)} conferences and {len(patents)} patents.")
