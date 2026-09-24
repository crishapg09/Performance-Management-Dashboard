#!/usr/bin/env python3
"""
Extract the REACH TA satisfaction survey into the dashboard's Feedback data file.

Usage:
    python scripts/extract_survey.py <analysis.xlsx> <case_export.xlsx> [--as-of=YYYY-MM-DD]

  analysis.xlsx     REACH_TA_Survey_Analysis_FINAL.xlsx: the "Merged data" sheet
                    (one row per response, ratings and coded themes) and the
                    "Response data" sheet (the raw open-text answers).
  case_export.xlsx  the ServiceNow case export (the same file scripts/extract.py
                    reads). Its "Number" column is the case number (CS…) that
                    respondents quote as "TA Case Number".

Writes app/src/data/survey.json: one record per response, each carrying the
request attributes the filter bar needs (type, region, office, practice,
programme offer) from the case it rates. The app normalises those with the
same maps as the request data and computes every figure at render time, so
the Feedback tab responds to the filters.

Why the case number and not the request id: ServiceNow numbers requests (CSR…)
and cases (CS…) from separate counters, so the two never line up. The join is
on the case number only; the extractor reports how many responses matched and
how many of those agree on the country office, as a check.

The join uses the FULL export, including requests later voided, duplicated or
discontinued: the dashboard drops those from the request data, but a
respondent still rated the work, so the feedback stays in.

Requires: openpyxl  (pip install openpyxl)
"""
import json
import os
import sys
import warnings

warnings.filterwarnings('ignore')

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'app', 'src', 'data', 'survey.json')

# Offices are reported with UNICEF's own naming, which does not always match a
# country name. Regional offices map to the country that hosts them; a couple of
# entries are not countries at all and are listed in NOT_ON_MAP.
COORDS = json.loads(open(os.path.join(HERE, 'survey_office_coords.json'), encoding='utf-8').read())
NOT_ON_MAP = {'Office of Strat & Eviden(OSE)'}

MANUAL = {k: v for k, v in json.loads(
    open(os.path.join(HERE, 'survey_manual_coding.json'), encoding='utf-8').read()).items()
    if not k.startswith('_')}

# Rating labels -> 1-5, as used by the survey's own scoring.
SCALES = {
    'Satisfaction': {'Very dissatisfied': 1, 'Dissatisfied': 2,
                     'Neither satisfied nor dissatisfied': 3, 'Satisfied': 4, 'Very satisfied': 5},
    'Quality': {'Poor': 1, 'Fair': 2, 'Good': 3, 'Very Good': 4, 'Excellent': 5},
    'Timeliness': {'Much too late': 1, 'Too late': 2, 'Acceptable': 3, 'Timely': 4, 'Very Timely': 5},
    'Contribution': {'No Contribution': 1, 'Limited Contribution': 2, 'Moderate Contribution': 3,
                     'Significant Contribution': 4, 'Very Significant Contribution': 5},
}
# a non-answer in the open-text field: written, but not substantive
NON_SUBSTANTIVE = {'', 'n/a', 'na', 'no comment', 'no comments', 'none', 'nil', '.', '-', '..', '...'}


def load(path, sheet):
    """Rows of `sheet`, finding the header beneath the sheet's title block."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if sheet not in wb.sheetnames:
        raise SystemExit(f'ERROR: {os.path.basename(path)} has no "{sheet}" sheet '
                         f'(found: {", ".join(wb.sheetnames)})')
    ws = wb[sheet]
    ws.reset_dimensions()
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    hi = next((i for i, r in enumerate(rows)
               if r and sum(1 for c in r if c not in (None, '')) > 4), 0)
    header = [str(h).strip() if h is not None else '' for h in rows[hi]]
    data = [r for r in rows[hi + 1:] if any(c not in (None, '') for c in r)]
    return {h: i for i, h in enumerate(header)}, data


def load_cases(path):
    """Case number (CS…) -> the request attributes the filter bar uses, raw."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    ws.reset_dimensions()
    rows = ws.iter_rows(values_only=True)
    idx = {str(h).strip(): i for i, h in enumerate(next(rows)) if h is not None}
    need = {'Number': 'cs', 'Case Report': 'req', 'Request Type': 'type', 'Region': 'reg',
            'Office/Division': 'off', 'Global Practice and Cross Sectoral Teams': 'pr',
            'Primary Programme Offer': 'of'}
    missing = [c for c in need if c not in idx]
    if missing:
        raise SystemExit(f'ERROR: the case export has no {", ".join(missing)} column(s)')
    out = {}
    for r in rows:
        v = {k: ('' if r[idx[c]] is None else ' '.join(str(r[idx[c]]).split())) for c, k in need.items()}
        if v['cs']:
            out[v.pop('cs')] = v
    wb.close()
    return out


def score(row, idx, col):
    """A rating label mapped to 1-5; None when unscored (e.g. 'Too early to say')."""
    return SCALES[col].get(txt(row, idx, col))


def coded(row, idx):
    """Themes for a response: the workbook's own, or our coding for later arrivals."""
    manual = MANUAL.get(txt(row, idx, 'ID'))
    if manual is None:
        return (txt(row, idx, 'Positive Themes'),
                txt(row, idx, 'Improvement Theme'),
                txt(row, idx, 'Data-quality Flag'), False)
    return ('; '.join(manual.get('pos', [])), manual.get('imp', ''),
            manual.get('flag', ''), True)


def txt(row, idx, col):
    """Cell as trimmed text; '' when absent — short rows are ragged in these exports."""
    i = idx.get(col)
    if i is None or i >= len(row) or row[i] is None:
        return ''
    return ' '.join(str(row[i]).split())


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__.strip())
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = [a for a in sys.argv[1:] if a.startswith('--')]
    if len(args) != 2:
        raise SystemExit(__doc__.strip())
    path, case_path = args
    as_of = next((o.split('=', 1)[1] for o in opts if o.startswith('--as-of=')), None)
    import datetime
    d = datetime.datetime.strptime(as_of, '%Y-%m-%d') if as_of else datetime.datetime.now()
    as_of_label = d.strftime('%-d %b %Y')

    idx, rows = load(path, 'Merged data')
    # The merge blanks some open-text answers (every one of them "N/A"), so the
    # raw sheet is the authority on what was written. The Methodology tab counts
    # any non-blank answer as written, and excludes N/A-style answers only from
    # "substantive" — taking the text from here keeps both counts faithful.
    ridx, rrows = load(path, 'Response data')
    raw = {txt(r, ridx, 'ID'): txt(r, ridx, 'Open comment') for r in rrows}
    for col in ('ID', 'Country Office', 'TA Case Number', 'Open comment',
                'Satisfaction', 'Quality', 'Timeliness', 'Contribution', 'Recommend 0\u201310'):
        if col not in idx:
            raise SystemExit(f'ERROR: "Merged data" is missing the column "{col}". '
                             f'Found: {", ".join(k for k in idx if k)}')

    cases = load_cases(case_path)

    manual_used = 0
    recs = []
    for r in rows:
        body = raw.get(txt(r, idx, 'ID')) or txt(r, idx, 'Open comment')
        written = bool(body)
        substantive = written and body.strip().lower().rstrip('.!?') not in NON_SUBSTANTIVE
        pos, imp, flag, was_manual = coded(r, idx)
        if was_manual:
            manual_used += 1
        try:
            rec_score = float(txt(r, idx, 'Recommend 0\u201310'))
        except ValueError:
            rec_score = None
        office = txt(r, idx, 'Country Office')
        case = cases.get(txt(r, idx, 'TA Case Number'))
        rec = {
            'id': txt(r, idx, 'ID'), 'o': office,
            'x': body, 'w': 1 if written else 0, 'sb': 1 if substantive else 0,
            'p': pos, 'i': imp, 'f': flag,
            'sat': score(r, idx, 'Satisfaction'), 'qual': score(r, idx, 'Quality'),
            'time': score(r, idx, 'Timeliness'), 'contrib': score(r, idx, 'Contribution'),
            'rec': rec_score,
        }
        if case:
            rec['c'] = case
        recs.append(rec)

    offices = sorted({x['o'] for x in recs if x['o']})
    coords = {}
    for off in offices:
        if off in NOT_ON_MAP or off not in COORDS:
            continue
        lon, lat = COORDS[off]
        coords[off] = [round((lon + 180) / 360 * 1000, 1), round((90 - lat) / 180 * 500, 1)]

    out = {'asOf': as_of_label, 'responses': recs, 'coords': coords}
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))

    matched = [x for x in recs if 'c' in x]
    agree = sum(1 for x in matched if x['c']['off'] == x['o'])
    print(f"Wrote {os.path.relpath(OUT, os.path.join(HERE, '..'))}  \u00b7 as of {as_of_label}")
    print(f"  {len(recs):,} responses \u00b7 {sum(x['w'] for x in recs)} written "
          f"\u00b7 {sum(x['sb'] for x in recs)} substantive \u00b7 {sum(1 for x in recs if x['i'])} improvement "
          f"\u00b7 {sum(1 for x in recs if x['f'])} flagged")
    print(f"  {manual_used} responses coded from scripts/survey_manual_coding.json")
    print(f"  joined to a request on case number: {len(matched)} of {len(recs)} "
          f"(country office agrees on {agree} of {len(matched)})")
    for x in recs:
        if 'c' not in x:
            print(f"    NOT joined: response {x['id']} ({x['o']})")
        elif x['c']['off'] != x['o']:
            print(f"    office differs: response {x['id']} survey \"{x['o']}\" vs request \"{x['c']['off']}\"")
    unmapped = [o for o in offices if o not in coords]
    print(f"  {len(coords)} offices mapped of {len(offices)}")
    for off in unmapped:
        n = sum(1 for x in recs if x['o'] == off)
        note = ' \u2014 not a country office' if off in NOT_ON_MAP else ' \u2014 ADD IT TO survey_office_coords.json'
        print(f'    {off} ({n} response{"" if n == 1 else "s"}){note}')


if __name__ == '__main__':
    main()
