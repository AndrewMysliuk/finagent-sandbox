import pdfplumber
import json
import sys

pdf_path = sys.argv[1]


def parse_simple(p):
    rows = []
    with pdfplumber.open(p) as pdf:
        for page in pdf.pages:
            t = page.extract_table()
            if t:
                rows.extend(t)
    return rows


def parse_universal(p):
    rows = []
    with pdfplumber.open(p) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            if not words:
                continue

            line_map = {}

            for w in words:
                y = round(w["top"], 0)
                if y not in line_map:
                    line_map[y] = []
                line_map[y].append(w)

            for y in sorted(line_map.keys()):
                line = sorted(line_map[y], key=lambda w: w["x0"])
                rows.append([w["text"] for w in line])
    return rows


rows = parse_simple(pdf_path)

if not rows:
    rows = parse_universal(pdf_path)

print(json.dumps(rows, ensure_ascii=False))
