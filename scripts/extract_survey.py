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

TYPE = {'Regular': 'Routine', 'Big Ticket Item': 'Big Ticket'}
BANDS = [(4.5, 'a'), (4.0, 'b'), (3.5, 'c'), (0.0, 'd')]


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
    path = args[0]
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
    for col in ('ID', 'Country Office', 'Case Type', 'Open comment',
                'Satisfaction', 'Quality', 'Timeliness', 'Contribution', 'Recommend 0\u201310'):
        if col not in idx:
            raise SystemExit(f'ERROR: "Merged data" is missing the column "{col}". '
                             f'Found: {", ".join(k for k in idx if k)}')

    out = {}
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
        recs.append({
            'id': txt(r, idx, 'ID'),
            'office': txt(r, idx, 'Country Office'),
            'type': TYPE.get(txt(r, idx, 'Case Type'), txt(r, idx, 'Case Type')) or 'Unclassified',
            'body': body, 'written': written, 'substantive': substantive,
            'pos': pos, 'imp': imp, 'flag': flag,
            'sat': score(r, idx, 'Satisfaction'), 'qual': score(r, idx, 'Quality'),
            'time': score(r, idx, 'Timeliness'), 'contrib': score(r, idx, 'Contribution'),
            'rec': rec_score,
        })

    out['kpi'] = {
        'responses': len(recs),
        'written': sum(1 for x in recs if x['written']),
        'substantive': sum(1 for x in recs if x['substantive']),
        'improvement': sum(1 for x in recs if x['imp']),
        'flags': sum(1 for x in recs if x['flag']),
    }

    acc = {k: [x[k] for x in recs if x[k] is not None] for k in ('sat', 'qual', 'time', 'rec', 'contrib')}
    out['avg'] = {k: mean(v) for k, v in acc.items()}
    out['avgN'] = {k: len(v) for k, v in acc.items()}

    pos, imp, flag, pos_by_type = {}, {}, {}, {}
    for x in recs:
        for th in [t.strip() for t in x['pos'].split(';') if t.strip()]:
            pos[th] = pos.get(th, 0) + 1
            pos_by_type.setdefault(th, {'Routine': 0, 'Big Ticket': 0, 'Unclassified': 0})
            pos_by_type[th][x['type']] = pos_by_type[th].get(x['type'], 0) + 1
        if x['imp']:
            imp[x['imp']] = imp.get(x['imp'], 0) + 1
        if x['flag']:
            flag[x['flag']] = flag.get(x['flag'], 0) + 1

    srt = lambda d: sorted(d.items(), key=lambda kv: -kv[1])
    out['positive'] = [{'label': k, 'n': v} for k, v in srt(pos)]
    out['improvement'] = [{'label': k, 'n': v} for k, v in srt(imp)]
    out['flags'] = [{'label': k, 'n': v} for k, v in srt(flag)]
    out['posByType'] = [dict({'label': k}, **pos_by_type[k]) for k, _ in srt(pos)]

    offices = {}
    for x in recs:
        if not x['office']:
            continue
        e = offices.setdefault(x['office'], {'n': 0, 'sat': [], 'qual': [], 'time': [],
                                             'good': [], 'fix': []})
        e['n'] += 1
        for k in ('sat', 'qual', 'time'):
            if x[k] is not None:
                e[k].append(x[k])
        if x['substantive'] and len(x['body']) >= 35:
            if x['pos']:
                e['good'].append((x['body'], x['sat'], x['pos'].split(';')[0].strip()))
            if x['imp']:
                e['fix'].append((x['body'], x['sat'], x['imp']))

    unmapped, pts = [], []
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
            t, _, th = sorted(e['good'], key=lambda z: (-(z[1] or 0), len(z[0])))[0]
            p['g'] = {'t': clip(t), 'th': th}
        if e['fix']:
            t, _, th = sorted(e['fix'], key=lambda z: abs(len(z[0]) - 150))[0]
            p['f'] = {'t': clip(t), 'th': th}
        pts.append(p)
    out['map'] = pts

    out['comments'] = [{'o': x['office'], 't': x['type'], 'x': x['body'], 'p': x['pos'],
                        'i': x['imp'], 'f': x['flag'], 's': x['sat']}
                       for x in recs if x['substantive']]

    counts = {}
    for x in recs:
        counts[x['type']] = counts.get(x['type'], 0) + 1
    out['asOf'] = as_of_label
    out['caseTypeCounts'] = counts
    out['officeTotal'] = len(offices)

    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))

    k = out['kpi']
    print(f"Wrote {os.path.relpath(OUT, os.path.join(HERE, '..'))}")
    print(f"  {k['responses']:,} responses \u00b7 {k['written']:,} written \u00b7 {k['substantive']:,} substantive "
          f"\u00b7 {k['improvement']} improvement \u00b7 {k['flags']} flagged")
    print(f"  {len(acc['sat']):,} of {k['responses']:,} responses carry a rating "
          f"(average satisfaction {out['avg']['sat']})")
    print(f"  {manual_used} responses coded from scripts/survey_manual_coding.json")
    print(f"  {len(pts)} offices mapped of {len(offices)} \u00b7 as of {as_of_label}")
    if unmapped:
        print('  NOT on the map (no coordinate):')
        for off, n in unmapped:
            note = ' \u2014 not a country office' if off in NOT_ON_MAP else ' \u2014 ADD IT TO survey_office_coords.json'
            print(f'    {off} ({n} response{"" if n == 1 else "s"}){note}')


if __name__ == '__main__':
    main()
