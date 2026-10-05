#!/usr/bin/env python3
"""
Build the Power BI semantic model (TMDL) for the REACH TA dashboard.

Usage:
    python powerbi/tools/build_model.py

Writes powerbi/REACH_TA_Dashboard.SemanticModel/. The Power Query code lives in
powerbi/tools/m/*.m; the lookup tables (regions, offers, survey coding and
corrections, map coordinates) are generated here from the web dashboard's own
source files, so the two cannot drift apart. Re-run after changing any of them.
"""
import json
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
M_DIR = os.path.join(HERE, 'm')
OUT = os.path.join(REPO, 'powerbi', 'REACH_TA_Dashboard.SemanticModel')


# --------------------------------------------------------------------------- M literals

def mstr(s):
    """An M text literal."""
    return '"' + str(s).replace('"', '""') + '"'


def mtable(columns, rows, types=None):
    types = types or ['text'] * len(columns)
    cols = ', '.join(f'#"{c}" = {t}' if ' ' in c else f'{c} = {t}' for c, t in zip(columns, types))
    def cell(v, t):
        if v is None:
            return 'null'
        return mstr(v) if t == 'text' else repr(v)
    body = ',\n        '.join('{' + ', '.join(cell(v, t) for v, t in zip(r, types)) + '}' for r in rows)
    return f'#table(type table [{cols}],\n    {{\n        {body}\n    }})'


def read(path):
    with open(os.path.join(REPO, path), encoding='utf-8') as f:
        return f.read()


def literal_queries():
    q = {}

    # regions: the reference sheet, then the aliases from regionMap.ts (later rows win)
    ref = json.loads(read('app/src/data/regionSource.json'))
    rows = [[c.strip(), c.strip(), r.strip()] for c, r in ref]
    aliases = re.findall(r"\['([^']+)', '([^']+)', '([^']+)'\]", read('app/src/lib/regionMap.ts'))
    rows += [[a, c, r] for a, c, r in aliases]
    q['RegionReference'] = (
        '// "Regions & Countries 2026" reference plus aliases (generated from\n'
        '// app/src/data/regionSource.json and app/src/lib/regionMap.ts).\n'
        + mtable(['Name', 'Office', 'Region'], rows))

    # programme offers: parse the LOOKUP table and its constants out of offerMap.ts
    src = read('app/src/lib/offerMap.ts')
    consts = dict(re.findall(r"const (\w+) = '([^']*)';", src))
    body = src[src.index('const LOOKUP'):]
    body = body[:body.index('};')]
    pairs = []
    for key, val in re.findall(r"'([^']*)':\s*('[^']*'|\w+)", body):
        pairs.append([key, val.strip("'") if val.startswith("'") else consts[val]])
    q['OfferLookup'] = ('// Programme offer variants -> canonical name (generated from app/src/lib/offerMap.ts).\n'
                        + mtable(['Key', 'Offer'], pairs))

    q['HqOffices'] = ('// HQ divisions that appear as offices: a readable name, filed under region HQ.\n'
                      + mtable(['Raw', 'Office'], [['Office of Strat & Eviden(OSE)', 'Office of Strategy and Evidence (OSE)']]))

    ex = re.search(r'EXCLUDED_RESOLUTIONS = \{(.*?)\}', read('scripts/extract.py'), re.S).group(1)
    vals = re.findall(r"'([^']+)'", ex)
    q['ExcludedResolutions'] = ('// Resolution codes for administrative non-work, dropped entirely (scripts/extract.py).\n'
                                + '{' + ', '.join(mstr(v) for v in vals) + '}')

    coding = json.loads(read('scripts/survey_manual_coding.json'))
    rows = [[k, '; '.join(v.get('pos', [])), v.get('imp', ''), v.get('flag', '')]
            for k, v in coding.items() if not k.startswith('_')]
    q['ManualCoding'] = ('// Theme coding for the responses that arrived after the workbook\'s own coding pass\n'
                         '// (generated from scripts/survey_manual_coding.json).\n'
                         + mtable(['ID', 'Positive', 'Improvement', 'Flag'], rows))

    fixes = json.loads(read('scripts/survey_corrections.json'))
    rows = [[k, v['from'], v['to']] for k, v in fixes.get('satisfaction', {}).items()]
    q['SatisfactionCorrections'] = ('// Satisfaction answers confirmed as the wrong end of the scale\n'
                                    '// (generated from scripts/survey_corrections.json).\n'
                                    + mtable(['Case number', 'From', 'To'], rows))
    q['ExcludedResponses'] = ('// Survey responses removed from the Feedback data (scripts/survey_corrections.json).\n'
                              + '{' + ', '.join(mstr(k) for k in fixes.get('exclude', {})) + '}')

    coords = json.loads(read('scripts/survey_office_coords.json'))
    rows = [[o, round(lon, 4), round(lat, 4)] for o, (lon, lat) in sorted(coords.items())]
    q['OfficeCoords'] = ('// Map position of each office as respondents named it (scripts/survey_office_coords.json).\n'
                         + mtable(['Office', 'Longitude', 'Latitude'], rows, ['text', 'number', 'number']))

    fv = read('app/src/components/FeedbackView.tsx')
    quotes = []
    for name, tone in (('GOOD_QUOTES', 'Positive'), ('FIX_QUOTES', 'Improvement')):
        block = fv[fv.index(f'const {name}'):]
        block = block[:block.index('};')]
        for qid, text in re.findall(r"'(\d+)':\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')", block):
            quotes.append([qid, tone, text[1:-1].replace("\\'", "'")])
    q['FeaturedQuotes'] = ('// Hand-picked quotes, lightly edited for length (from FeedbackView.tsx).\n'
                           + mtable(['ID', 'Tone', 'Quote'], quotes))
    return q


# --------------------------------------------------------------------------- parameters

PARAMETERS = [
    ('DataSource', 'Excel export', 'Where the request data comes from.', ['ServiceNow API', 'Excel export']),
    ('ServiceNowInstance', 'https://YOUR-INSTANCE.service-now.com', 'Base URL of the ServiceNow instance.', None),
    ('ServiceNowTable', 'sn_customerservice_case', 'Table the TA cases live in.', None),
    ('ServiceNowQuery', '', 'Optional encoded query (the filter of your "Case Report"), e.g. active=true^... Leave blank for every case.', None),
    ('ExcelExportPath', r'C:\REACH\sn_customerservice_case.xlsx', 'The ServiceNow Excel export: a local path or a SharePoint/OneDrive file URL. Used when DataSource = "Excel export".', None),
    ('SurveyWorkbookPath', r'C:\REACH\REACH_TA_Survey_Analysis_FINAL.xlsx', 'The survey analysis workbook: a local path or a SharePoint/OneDrive file URL.', None),
]

# shared (not loaded) queries, in dependency-friendly order, with their query group
SHARED = [
    ('Functions', ['fnReadFile', 'fnText', 'fnToDateTime', 'fnCleanHtml', 'fnIsPlaceholder', 'fnNormOffice',
                   'fnMapOffices', 'fnMapOffer', 'fnMapPractice', 'fnMapType', 'fnSurveySheet']),
    ('Lookups', ['RegionReference', 'OfficeLookup', 'OfferLookup', 'HqOffices', 'ExcludedResolutions',
                 'ManualCoding', 'SatisfactionCorrections', 'ExcludedResponses', 'OfficeCoords', 'FeaturedQuotes']),
    ('Source', ['FieldMap', 'RawRequestsApi', 'RawRequestsExcel', 'RawRequestsAll', 'AsOf']),
]

# --------------------------------------------------------------------------- tables

S, I, D, DT, DATE = 'string', 'int64', 'double', 'dateTime', 'dateTime'

YN = 'Yes / No'


def col(name, dtype=S, hidden=False, sort=None, fmt=None, cat=None, desc=None, summarize='none'):
    return dict(name=name, dtype=dtype, hidden=hidden, sort=sort, fmt=fmt, cat=cat, desc=desc, summarize=summarize)


TABLES = {}

TABLES['Requests'] = dict(query='Requests', desc='One row per TA request, cleaned and normalised as in the web dashboard.', columns=[
    col('Request ID', desc='The request number (CSR…).'),
    col('Case number', desc='The case number (CS…); the survey links on this.'),
    col('Request type'), col('Region', desc='Region decided by the office (Regions & Countries 2026 reference).'),
    col('Office'), col('Office as recorded', hidden=True), col('Region as recorded', hidden=True),
    col('Practice'), col('Programme offer'), col('Offer as recorded', hidden=True),
    col('Modality'), col('Language', hidden=True),
    col('Status', sort='Status order'), col('Status order', I, hidden=True),
    col('TA lead'), col('Requested for'), col('Requested by', hidden=True), col('Short description'),
    col('Details', desc='Details/Description with the formatting removed; falls back to the short description.'),
    col('Collaborators', hidden=True),
    col('Expected start', DT, fmt='dd mmm yyyy'), col('Expected completion', DT, fmt='dd mmm yyyy'),
    col('Created', DT, fmt='dd mmm yyyy'), col('Opened', DT, fmt='dd mmm yyyy'), col('Updated', DT, fmt='dd mmm yyyy'),
    col('Resolved', DT, fmt='dd mmm yyyy'), col('Closed', DT, fmt='dd mmm yyyy'),
    col('Resolution code', hidden=True), col('State', hidden=True),
    col('Expected completion quarter'),
    col('Has description', desc=YN + ': a real description, not placeholder text.'),
    col('Placeholder description', desc=YN), col('Has objectives', desc=YN),
    col('Country office request', desc=YN + ': the office is in one of the six regions. The Data Quality universe.'),
    col('In performance scope', desc=YN + ': a country office request that is not discontinued. The Performance universe.'),
    col('Is overdue', desc=YN + ': not completed or discontinued, and past the expected completion date (includes unassigned).'),
    col('Days past target', I, summarize='none'),
    col('Overdue bucket', sort='Overdue bucket order'), col('Overdue bucket order', I, hidden=True),
    col('Is active', desc=YN + ': in progress (25%–75% or 0%), i.e. not completed, discontinued or unassigned.'),
    col('On track', desc=YN + ': active and not past the expected completion date.'),
    col('Received last 30 days', desc=YN + ': created in the 30 days up to the as-of date.'),
    col('Days since received', I),
    col('Opened month', DATE, hidden=True, fmt='mmm yyyy'), col('Completed month', DATE, hidden=True, fmt='mmm yyyy'),
    col('In review', desc=YN + ': Unassigned or 0%.'),
    col('Days waiting', I, desc='In review only: days since the last update (Unassigned: since received).'),
    col('Stalled', desc=YN + ': Unassigned over 14 days, or 0% not updated in 30.'),
    col('Time in setup', sort='Time in setup order'), col('Time in setup order', I, hidden=True),
    col('Ready to advance', desc=YN + ': 0% with a description, a TA lead and a target date.'),
    col('Assigned without lead', desc=YN + ': 0% (past assignment) but no TA lead.'),
    col('In delivery stage', desc=YN + ': 25%, 50%, 75% or 100%.'),
    col('Passes all checks', desc=YN + ': in delivery with lead, target date, description, modality and offer, and target not before start.'),
    col('Data issue', desc='In delivery: the first check the record fails.'),
    col('Target before start', desc=YN),
    col('Due in next 30 days', desc=YN + ': active, with the expected completion date in the next 30 days.'),
    col('Not closed', desc=YN + ': completed or discontinued but no Closed date.'),
    col('Not closed reason'),
    col('Phase', sort='Phase order', desc='In review / Started & in delivery / Overdue (each request once; discontinued excluded).'),
    col('Phase order', I, hidden=True),
    col('Phase detail', desc='In review: days waiting. Overdue: days past target. In delivery: the target date.'),
    col('Urgency', D, hidden=True),
    col('Possible duplicate', desc=YN + ': a later country office request with the same Requested For and short description.'),
    col('Source order', I, hidden=True),
])

TABLES['Survey'] = dict(query='Survey', desc='One row per survey response, linked to the request it rates by case number.', columns=[
    col('Response ID'), col('Survey office', desc='The office as the respondent named it.'),
    col('Case number'), col('Request ID'), col('Matched to request', desc=YN),
    col('Request type'), col('Region'), col('Office'), col('Practice'), col('Programme offer'),
    col('Comment'), col('Written', desc=YN), col('Substantive', desc=YN + ': written, and not "N/A" or similar.'),
    col('Has positive feedback', desc=YN), col('Positive themes'), col('Improvement theme'), col('Data quality flag'),
    col('Themes'), col('Rating', desc='Satisfaction as stars.'),
    col('Satisfaction', I, summarize='average'), col('Quality', I, summarize='average'),
    col('Timeliness', I, summarize='average'), col('Contribution', I, summarize='average'),
    col('Recommend', D, summarize='average'),
    col('Longitude', D, cat='Longitude', summarize='average'), col('Latitude', D, cat='Latitude', summarize='average'),
    col('Featured quote'), col('Featured quote tone'),
])

TABLES['SurveyThemes'] = dict(query='SurveyThemes', desc='One row per theme a response was coded to.', columns=[
    col('Response ID'), col('Kind'), col('Theme'), col('Theme is other', I, hidden=True),
])

TABLES['DimType'] = dict(query='DimType', desc='Request types, for the slicer.', columns=[col('Request type')])
TABLES['DimPractice'] = dict(query='DimPractice', desc='Global practices, for the slicer.', columns=[col('Practice')])
TABLES['DimOffer'] = dict(query='DimOffer', desc='Programme offers, for the slicer.', columns=[col('Programme offer')])
TABLES['DimOffice'] = dict(query='DimOffice', desc='Country offices and their region, for the slicers.', columns=[
    col('Office'), col('Region')])
TABLES['DimMonth'] = dict(query='DimMonth', desc='Months from April 2026 to the as-of month.', columns=[
    col('Month', DATE, fmt='mmm yyyy', hidden=True), col('Month label', sort='Month order'), col('Month order', I, hidden=True)])
TABLES['Portfolio metric'] = dict(query='PortfolioMetric', desc='Pick a metric to re-break the practice chart.', columns=[
    col('Metric', sort='Metric order'), col('Metric order', I, hidden=True), col('Description')])
TABLES['Completeness check'] = dict(query='CompletenessCheck', desc='Fields checked on started requests.', columns=[
    col('Field', sort='Field order'), col('Field order', I, hidden=True)])
TABLES['Data date'] = dict(query='DataDate', desc='The as-of date and the refresh time.', columns=[
    col('As of', DATE, fmt='d mmm yyyy'), col('Refreshed', DT, fmt='d mmm yyyy hh:nn')])

RELATIONSHIPS = [
    # (from table, from col, to table, to col, extra)
    ('Requests', 'Request type', 'DimType', 'Request type', {}),
    ('Requests', 'Practice', 'DimPractice', 'Practice', {}),
    ('Requests', 'Programme offer', 'DimOffer', 'Programme offer', {}),
    ('Requests', 'Office', 'DimOffice', 'Office', {}),
    ('Requests', 'Opened month', 'DimMonth', 'Month', {}),
    ('Requests', 'Completed month', 'DimMonth', 'Month', {'isActive': 'false'}),
    ('Survey', 'Request type', 'DimType', 'Request type', {}),
    ('Survey', 'Practice', 'DimPractice', 'Practice', {}),
    ('Survey', 'Programme offer', 'DimOffer', 'Programme offer', {}),
    ('Survey', 'Office', 'DimOffice', 'Office', {}),
    # both ways, so picking a theme narrows the responses (comments table, map)
    ('SurveyThemes', 'Response ID', 'Survey', 'Response ID', {'crossFilteringBehavior': 'bothDirections'}),
]

# --------------------------------------------------------------------------- measures

from measures import MEASURES  # noqa: E402  (table, name, dax, format, folder, description, hidden)


# --------------------------------------------------------------------------- TMDL writing

def q(name):
    """Quote a TMDL object name when needed."""
    return name if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name) else "'" + name.replace("'", "''") + "'"


def indent(text, tabs):
    pad = '\t' * tabs
    return '\n'.join((pad + line) if line.strip() else '' for line in text.strip('\n').split('\n'))


def m_source(name, literals):
    if name in literals:
        return literals[name]
    with open(os.path.join(M_DIR, name + '.m'), encoding='utf-8') as f:
        return f.read()


def description(text, tabs):
    pad = '\t' * tabs
    return '\n'.join(pad + '/// ' + line for line in text.split('\n')) + '\n'


def write_model():
    literals = literal_queries()
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    defn = os.path.join(OUT, 'definition')
    os.makedirs(os.path.join(defn, 'tables'))

    with open(os.path.join(OUT, 'definition.pbism'), 'w', encoding='utf-8') as f:
        json.dump({'$schema': 'https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json',
                   'version': '4.2', 'settings': {}}, f, indent=2)

    with open(os.path.join(defn, 'database.tmdl'), 'w', encoding='utf-8') as f:
        f.write('database\n\tcompatibilityLevel: 1567\n')

    groups = ['Parameters', 'Functions', 'Lookups', 'Source']
    model = ['model Model', '\tculture: en-US', '\tdefaultPowerBIDataSourceVersion: powerBI_V3',
             '\tdiscourageImplicitMeasures', '\tsourceQueryCulture: en-GB', '']
    for i, g in enumerate(groups):
        model += [f'queryGroup {g}', '', f'\tannotation PBI_QueryGroupOrder = {i}', '']
    model += ['annotation __PBI_TimeIntelligenceEnabled = 0', '']
    for t in TABLES:
        model.append(f'ref table {q(t)}')
    with open(os.path.join(defn, 'model.tmdl'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(model) + '\n')

    ex = []
    for name, value, desc, options in PARAMETERS:
        meta = f'IsParameterQuery=true, Type="Text", IsParameterQueryRequired={"false" if value == "" else "true"}'
        if options:
            meta += ', List={' + ', '.join(mstr(o) for o in options) + '}, DefaultValue=' + mstr(value)
        ex.append(description(desc, 0) + f'expression {name} = {mstr(value)} meta [{meta}]\n'
                  f'\tqueryGroup: Parameters\n\n\tannotation PBI_ResultType = Text\n')
    for group, names in SHARED:
        for name in names:
            src = m_source(name, literals)
            ex.append(f'expression {q(name)} =\n{indent(src, 2)}\n\tqueryGroup: {group}\n')
    with open(os.path.join(defn, 'expressions.tmdl'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(ex))

    by_table = {}
    for m in MEASURES:
        by_table.setdefault(m['table'], []).append(m)

    for tname, t in TABLES.items():
        lines = [description(t['desc'], 0).rstrip('\n'), f'table {q(tname)}', '']
        for m in by_table.get(tname, []):
            dax = m['dax'].strip('\n')
            if '\n' in dax:
                lines.append(description(m['desc'], 1).rstrip('\n') if m.get('desc') else None)
                lines.append(f'\tmeasure {q(m["name"])} =')
                lines.append(indent(dax, 3))
            else:
                if m.get('desc'):
                    lines.append(description(m['desc'], 1).rstrip('\n'))
                lines.append(f'\tmeasure {q(m["name"])} = {dax}')
            if m.get('fmt'):
                lines.append(f'\t\tformatString: {m["fmt"]}')
            if m.get('folder'):
                lines.append(f'\t\tdisplayFolder: {m["folder"]}')
            if m.get('hidden'):
                lines.append('\t\tisHidden')
            lines.append('')
        for c in t['columns']:
            if c['desc']:
                lines.append(description(c['desc'], 1).rstrip('\n'))
            lines.append(f'\tcolumn {q(c["name"])}')
            lines.append(f'\t\tdataType: {c["dtype"]}')
            if c['fmt']:
                lines.append(f'\t\tformatString: {c["fmt"]}')
            elif c['dtype'] == 'int64':
                lines.append('\t\tformatString: 0')
            if c['hidden']:
                lines.append('\t\tisHidden')
            if c['cat']:
                lines.append(f'\t\tdataCategory: {c["cat"]}')
            lines.append(f'\t\tsummarizeBy: {c["summarize"]}')
            lines.append(f'\t\tsourceColumn: {c["name"]}')
            if c['sort']:
                lines.append(f'\t\tsortByColumn: {q(c["sort"])}')
            lines.append('')
        src = m_source(t['query'], literals)
        lines.append(f'\tpartition {q(tname)} = m')
        lines.append('\t\tmode: import')
        lines.append('\t\tsource =')
        lines.append(indent(src, 4))
        lines.append('')
        text = '\n'.join(l for l in lines if l is not None)
        fname = tname + '.tmdl'
        with open(os.path.join(defn, 'tables', fname), 'w', encoding='utf-8') as f:
            f.write(text)

    rel = []
    for i, (ft, fc, tt, tc, extra) in enumerate(RELATIONSHIPS):
        rel.append(f'relationship rel{i + 1:02d}')
        for k, v in extra.items():
            rel.append(f'\t{k}: {v}')
        rel.append(f'\tfromColumn: {q(ft)}.{q(fc)}')
        rel.append(f'\ttoColumn: {q(tt)}.{q(tc)}')
        rel.append('')
    with open(os.path.join(defn, 'relationships.tmdl'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(rel))

    # every query, for the syntax check
    allm = {n: m_source(n, literals) for _, names in SHARED for n in names}
    allm.update({t['query']: m_source(t['query'], literals) for t in TABLES.values()})
    return allm


if __name__ == '__main__':
    allm = write_model()
    print(f'Wrote {os.path.relpath(OUT, REPO)}: {len(TABLES)} tables, {len(MEASURES)} measures, '
          f'{len(RELATIONSHIPS)} relationships, {len(allm)} queries')
