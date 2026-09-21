#!/usr/bin/env python3
"""
Extract the REACH TA satisfaction survey into the dashboard's Feedback data file.

Usage:
    python scripts/extract_survey.py <qualitative.xlsx> [<ratings.xlsx>]

  qualitative.xlsx  the workbook carrying the "Comment Data" sheet: one row per
                    response, with the coded positive / improvement themes and
                    the data-quality flags.
  ratings.xlsx      optional; the workbook carrying the "Cleaned Data" sheet,
                    which holds the numeric satisfaction / quality / timeliness
                    / recommendation scores. Joined on the response ID.

Writes app/src/data/survey.json.

Why two files: the qualitative export does not carry the rating columns, and the
ratings export lags it (it covers fewer responses). Every response present in
both is matched on ID; the extractor reports how many were matched so the
coverage is visible rather than assumed.

The survey identifies requests by a case number (CS…) that does not correspond
to the request dataset's own identifier (CSR…), so this data is NOT joined to
the request portfolio. The Feedback view reports it on its own.

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

TYPE = {'Regular': 'Routine', 'Big Ticket Item': 'Big Ticket'}
BANDS = [(4.5, 'a'), (4.0, 'b'), (3.5, 'c'), (0.0, 'd')]


def load(path, sheet):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if sheet not in wb.sheetnames:
        raise SystemExit(f'ERROR: {os.path.basename(path)} has no "{sheet}" sheet '
                         f'(found: {", ".join(wb.sheetnames)})')
    ws = wb[sheet]
    ws.reset_dimensions()
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    header = list(rows[0])
    return {h: i for i, h in enumerate(header)}, [r for r in rows[1:] if r[0] not in (None, '')]


def txt(row, idx, col):
    if col not in idx:
        return ''
    v = row[idx[col]]
    return '' if v is None else ' '.join(str(v).split())


def num(row, idx, col):
    if col not in idx:
        return None
    try:
        return float(row[idx[col]])
    except (TypeError, ValueError):
        return None


def mean(v):
    return round(sum(v) / len(v), 2) if v else None


def clip(s, n=240):
    if len(s) <= n:
        return s
    cut = s[:n]
    sp = cut.rfind(' ')
    return (cut[:sp] if sp > n * 0.6 else cut).rstrip(' ,.;:') + '…'


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__.strip())
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = [a for a in sys.argv[1:] if a.startswith('--')]
    qual_path = args[0]
    rate_path = args[1] if len(args) > 1 else None
    as_of = None
    for o in opts:
        if o.startswith('--as-of='):
            as_of = o.split('=', 1)[1]
    import datetime
    d = datetime.datetime.strptime(as_of, '%Y-%m-%d') if as_of else datetime.datetime.now()
    as_of_label = d.strftime('%-d %b %Y')

    qi, qrows = load(qual_path, 'Comment Data')
    for col in ('ID', 'Country Office', 'Case Type', 'Open Comment',
                'Written Comment', 'Substantive Comment', 'Positive Themes',
                'Improvement Theme', 'Data-quality Flag'):
        if col not in qi:
            raise SystemExit(f'ERROR: "Comment Data" is missing the column "{col}".')

    scores = {}
    if rate_path:
        ri, rrows = load(rate_path, 'Cleaned Data')
        for r in rrows:
            scores[txt(r, ri, 'ID')] = {
                'sat': num(r, ri, 'Satisfaction Score'),
                'qual': num(r, ri, 'Quality Score'),
                'time': num(r, ri, 'Timeliness Score'),
                'rec': num(r, ri, 'Recommendation (0-10)'),
            }

    out = {}

    # ---- headline counts -------------------------------------------------
    out['kpi'] = {
        'responses': len(qrows),
        'written': sum(1 for r in qrows if txt(r, qi, 'Written Comment') == 'Yes'),
        'substantive': sum(1 for r in qrows if txt(r, qi, 'Substantive Comment') == 'Yes'),
        'improvement': sum(1 for r in qrows if txt(r, qi, 'Improvement Theme')),
        'flags': sum(1 for r in qrows if txt(r, qi, 'Data-quality Flag')),
    }

    # ---- averages, over the responses that carry a rating ----------------
    acc = {'sat': [], 'qual': [], 'time': [], 'rec': []}
    for r in qrows:
        s = scores.get(txt(r, qi, 'ID'))
        if s:
            for k in acc:
                if s[k] is not None:
                    acc[k].append(s[k])
    out['avg'] = {k: mean(v) for k, v in acc.items()}
    out['avgN'] = {k: len(v) for k, v in acc.items()}

    # ---- themes ----------------------------------------------------------
    pos, imp, flag = {}, {}, {}
    pos_by_type = {}
    for r in qrows:
        ct = TYPE.get(txt(r, qi, 'Case Type'), txt(r, qi, 'Case Type')) or 'Unclassified'
        for th in [t.strip() for t in txt(r, qi, 'Positive Themes').split(';') if t.strip()]:
            pos[th] = pos.get(th, 0) + 1
            pos_by_type.setdefault(th, {'Routine': 0, 'Big Ticket': 0, 'Unclassified': 0})
            pos_by_type[th][ct] = pos_by_type[th].get(ct, 0) + 1
        if txt(r, qi, 'Improvement Theme'):
            k = txt(r, qi, 'Improvement Theme')
            imp[k] = imp.get(k, 0) + 1
        if txt(r, qi, 'Data-quality Flag'):
            k = txt(r, qi, 'Data-quality Flag')
            flag[k] = flag.get(k, 0) + 1

    srt = lambda d: sorted(d.items(), key=lambda kv: -kv[1])
    out['positive'] = [{'label': k, 'n': v} for k, v in srt(pos)]
    out['improvement'] = [{'label': k, 'n': v} for k, v in srt(imp)]
    out['flags'] = [{'label': k, 'n': v} for k, v in srt(flag)]
    out['posByType'] = [dict({'label': k}, **pos_by_type[k]) for k, _ in srt(pos)]

    # ---- per-office rollup, for the map ----------------------------------
    offices = {}
    for r in qrows:
        off = txt(r, qi, 'Country Office')
        if not off:
            continue
        e = offices.setdefault(off, {'n': 0, 'sat': [], 'qual': [], 'time': [],
                                     'good': [], 'fix': []})
        e['n'] += 1
        s = scores.get(txt(r, qi, 'ID'))
        if s:
            for k in ('sat', 'qual', 'time'):
                if s[k] is not None:
                    e[k].append(s[k])
        body = txt(r, qi, 'Open Comment')
        if txt(r, qi, 'Substantive Comment') == 'Yes' and len(body) >= 35:
            rating = s['sat'] if s else None
            if txt(r, qi, 'Positive Themes'):
                e['good'].append((body, rating, txt(r, qi, 'Positive Themes').split(';')[0].strip()))
            if txt(r, qi, 'Improvement Theme'):
                e['fix'].append((body, rating, txt(r, qi, 'Improvement Theme')))

    unmapped = []
    pts = []
    for off, e in sorted(offices.items(), key=lambda kv: -kv[1]['n']):
        if off in NOT_ON_MAP or off not in COORDS:
            unmapped.append((off, e['n']))
            continue
        lon, lat = COORDS[off]
        p = {'o': off, 'n': e['n'],
             'x': round((lon + 180) / 360 * 1000, 1),
             'y': round((90 - lat) / 180 * 500, 1),
             'sat': mean(e['sat']), 'qual': mean(e['qual']), 'time': mean(e['time']),
             'r': len(e['sat'])}
        if e['good']:
            # the best-rated comment, and among equals the most quotable
            t, _, th = sorted(e['good'], key=lambda x: (-(x[1] or 0), len(x[0])))[0]
            p['g'] = {'t': clip(t), 'th': th}
        if e['fix']:
            # the most quotable, rather than the longest
            t, _, th = sorted(e['fix'], key=lambda x: abs(len(x[0]) - 150))[0]
            p['f'] = {'t': clip(t), 'th': th}
        pts.append(p)
    out['map'] = pts

    # ---- every substantive comment, for the table ------------------------
    out['comments'] = []
    for r in qrows:
        if txt(r, qi, 'Substantive Comment') != 'Yes':
            continue
        body = txt(r, qi, 'Open Comment')
        if not body:
            continue
        s = scores.get(txt(r, qi, 'ID'))
        out['comments'].append({
            'o': txt(r, qi, 'Country Office'),
            't': TYPE.get(txt(r, qi, 'Case Type'), txt(r, qi, 'Case Type')) or 'Unclassified',
            'x': body,
            'p': txt(r, qi, 'Positive Themes'),
            'i': txt(r, qi, 'Improvement Theme'),
            'f': txt(r, qi, 'Data-quality Flag'),
            's': s['sat'] if s else None,
        })

    counts = {}
    for r in qrows:
        ct = TYPE.get(txt(r, qi, 'Case Type'), txt(r, qi, 'Case Type')) or 'Unclassified'
        counts[ct] = counts.get(ct, 0) + 1
    out['asOf'] = as_of_label
    out['caseTypeCounts'] = counts
    out['officeTotal'] = len(offices)

    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))

    k = out['kpi']
    print(f"Wrote {os.path.relpath(OUT, os.path.join(HERE, '..'))}")
    print(f"  {k['responses']:,} responses · {k['written']:,} written · {k['substantive']:,} substantive "
          f"· {k['improvement']} improvement · {k['flags']} flagged")
    print(f"  {len(acc['sat']):,} of {k['responses']:,} responses carry a rating "
          f"(average satisfaction {out['avg']['sat']})")
    print(f"  {len(pts)} offices mapped of {len(offices)}")
    print(f"  as of {as_of_label}")
    if unmapped:
        print('  NOT on the map (no coordinate):')
        for off, n in unmapped:
            note = ' — not a country office' if off in NOT_ON_MAP else ' — ADD IT TO survey_office_coords.json'
            print(f'    {off} ({n} response{"" if n == 1 else "s"}){note}')


if __name__ == '__main__':
    main()
