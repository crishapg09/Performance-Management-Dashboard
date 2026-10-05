#!/usr/bin/env python3
"""
Build the Power BI report (PBIR) for the REACH TA dashboard.

Usage:
    python powerbi/tools/build_report.py

Writes powerbi/REACH_TA_Dashboard.Report/ and the .pbip file that opens it. Three
pages mirror the web dashboard's tabs: Performance, Data Quality Review and
Feedback. Slicers are synced across pages, as the web filter bar is shared
across tabs. Layout is in this file; data definitions live in the model.
"""
import hashlib
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.join(REPO, 'powerbi')
NAME = 'REACH_TA_Dashboard'
OUT = os.path.join(ROOT, NAME + '.Report')

SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition'
V_VISUAL, V_PAGE, V_REPORT, V_PAGES, V_VERSION = '2.2.0', '2.0.0', '3.0.0', '1.0.0', '1.0.0'

W = 1280          # page width
M = 24            # side margin
GAP = 12
INNER = W - 2 * M

INK, MUTED, FAINT = '#0F2238', '#5B7186', '#9AA7B2'
BLUE, GREEN, AMBER, RED, NAVY, ORANGE = '#0B6FA4', '#2E7D5B', '#E0A21E', '#C0453F', '#16385C', '#CD6A2E'
STATUS_COLORS = {'0%': '#D6E0E8', '25%': '#9CC6E0', '50%': '#5BA3D0', '75%': '#2C7DB5', '100%': '#0B5A8A',
                 'Unassigned': '#E0A21E', 'Discontinued': '#9AA7B2'}
PHASE_COLORS = {'In review': BLUE, 'Started & in delivery': NAVY, 'Overdue': RED}
TYPE_COLORS = {'Routine': GREEN, 'Big Ticket': '#17513B', 'Unclassified': '#A8D5BF'}
BUCKET_COLORS = {'1–30 days': AMBER, '31–60 days': ORANGE, '>60 days': RED}


# --------------------------------------------------------------------------- expression helpers

def lit(v):
    return {'expr': {'Literal': {'Value': v}}}


def s(text):
    return lit("'" + str(text).replace("'", "''") + "'")


def n(x):
    return lit(f'{x}D')


def b(flag):
    return lit('true' if flag else 'false')


def solid(hex_):
    return {'solid': {'color': s(hex_)}}


def ref(entity):
    return {'SourceRef': {'Entity': entity}}


def column(entity, prop):
    return {'Column': {'Expression': ref(entity), 'Property': prop}}


def measure(entity, prop):
    return {'Measure': {'Expression': ref(entity), 'Property': prop}}


def F(spec):
    """'Table[Column]' or 'Table.[Measure]' -> field expression."""
    if '.[' in spec:
        t, p = spec.split('.[', 1)
        return measure(t.strip("'"), p.rstrip(']'))
    t, p = spec.split('[', 1)
    return column(t.strip("'"), p.rstrip(']'))


def proj(spec, display=None):
    f = F(spec)
    kind = 'Measure' if 'Measure' in f else 'Column'
    entity = f[kind]['Expression']['SourceRef']['Entity']
    prop = f[kind]['Property']
    p = {'field': f, 'queryRef': f'{entity}.{prop}', 'nativeQueryRef': prop}
    if display:
        p['displayName'] = display
    return p


def scope_equals(spec, value):
    """Selector for one category value, e.g. a status colour."""
    f = F(spec)
    return {'data': [{'scopeId': {'Comparison': {'ComparisonKind': 0, 'Left': f, 'Right': {'Literal': {'Value': "'" + value + "'"}}}}}]}


def filter_in(name, spec, values):
    t, p = spec.split('[', 1)
    t, p = t.strip("'"), p.rstrip(']')
    return {
        'name': name, 'field': column(t, p), 'type': 'Categorical',
        'filter': {'Version': 2, 'From': [{'Name': 'x', 'Entity': t, 'Type': 0}],
                   'Where': [{'Condition': {'In': {
                       'Expressions': [{'Column': {'Expression': {'SourceRef': {'Source': 'x'}}, 'Property': p}}],
                       'Values': [[{'Literal': {'Value': "'" + v + "'"}}] for v in values]}}}]},
        'howCreated': 'User',
    }


def filter_measure_positive(name, spec):
    t, p = spec.split('.[', 1)
    p = p.rstrip(']')
    return {
        'name': name, 'field': measure(t, p), 'type': 'Advanced',
        'filter': {'Version': 2, 'From': [{'Name': 'x', 'Entity': t, 'Type': 0}],
                   'Where': [{'Condition': {'Comparison': {
                       'ComparisonKind': 1,
                       'Left': {'Measure': {'Expression': {'SourceRef': {'Source': 'x'}}, 'Property': p}},
                       'Right': {'Literal': {'Value': '0L'}}}}}]},
        'howCreated': 'User',
    }


# --------------------------------------------------------------------------- visual builders

def vid(page, key):
    return hashlib.sha1(f'{page}/{key}'.encode()).hexdigest()[:20]


def chrome(title=None, background=True, border=True, title_size=11):
    o = {}
    if title:
        o['title'] = [{'properties': {'show': b(True), 'text': s(title), 'fontSize': n(title_size), 'fontColor': solid(INK), 'bold': b(True)}}]
    else:
        o['title'] = [{'properties': {'show': b(False)}}]
    o['background'] = [{'properties': {'show': b(background), 'color': solid('#FFFFFF'), 'transparency': n(0)}}]
    o['border'] = [{'properties': {'show': b(border), 'color': solid('#E3E9EF'), 'radius': n(10)}}]
    o['dropShadow'] = [{'properties': {'show': b(False)}}]
    return o


class Page:
    def __init__(self, name, display, height):
        self.name, self.display, self.height = name, display, height
        self.visuals = []
        self.filters = []
        self.z = 0

    def add(self, key, x, y, w, h, visual, filters=None):
        self.z += 1
        c = {'$schema': f'{SCHEMA}/visualContainer/{V_VISUAL}/schema.json', 'name': vid(self.name, key),
             'position': {'x': x, 'y': y, 'z': self.z * 100, 'width': w, 'height': h, 'tabOrder': self.z * 100},
             'visual': visual}
        if filters:
            c['filterConfig'] = {'filters': filters}
        self.visuals.append(c)
        return c

    # ---- building blocks

    def text(self, key, x, y, w, h, runs, background=False):
        """runs: list of paragraphs, each a list of (text, size_pt, color, bold)."""
        paragraphs = [{'textRuns': [{'value': t, 'textStyle': {'fontSize': f'{size}pt', 'color': color,
                                                                **({'fontWeight': 'bold'} if bold else {})}}
                                    for t, size, color, bold in para]} for para in runs]
        vis = {'visualType': 'textbox',
               'objects': {'general': [{'properties': {'paragraphs': paragraphs}}]},
               'visualContainerObjects': chrome(background=background, border=False)}
        return self.add(key, x, y, w, h, vis)

    def heading(self, key, y, number, title, color=NAVY):
        return self.text(key, M, y, INNER, 36, [[(f'{number}   ', 15, color, True), (title, 15, INK, True)]])

    def note(self, key, x, y, w, h, spec, size=10, color=MUTED, background=False, border=False):
        """A text measure shown as wrapped body text (card, no category label)."""
        vis = {'visualType': 'card',
               'query': {'queryState': {'Values': {'projections': [proj(spec)]}}},
               'objects': {'labels': [{'properties': {'fontSize': n(size), 'color': solid(color)}}],
                           'categoryLabels': [{'properties': {'show': b(False)}}],
                           'wordWrap': [{'properties': {'show': b(True)}}]},
               'visualContainerObjects': chrome(background=background, border=border)}
        return self.add(key, x, y, w, h, vis)

    def kpi(self, key, x, y, w, label, value_spec, sub_spec=None, color=INK, value_size=26, h=86):
        vis = {'visualType': 'card',
               'query': {'queryState': {'Values': {'projections': [proj(value_spec, label)]}}},
               'objects': {'labels': [{'properties': {'fontSize': n(value_size), 'color': solid(color)}}],
                           'categoryLabels': [{'properties': {'show': b(False)}}]},
               'visualContainerObjects': chrome(title=label, title_size=10)}
        self.add(key, x, y, w, h, vis)
        if sub_spec:
            self.note(key + '-sub', x, y + h, w, 34, sub_spec, size=9, color=FAINT, background=True)

    def slicer(self, key, x, y, w, spec, label, sync, nonempty, h=56, single=False, mode='Dropdown'):
        objects = {'data': [{'properties': {'mode': s(mode)}}],
                   'header': [{'properties': {'show': b(True), 'fontColor': solid('#7A8C9C'), 'textSize': n(9)}}]}
        if single:
            objects['selection'] = [{'properties': {'singleSelect': b(True)}}]
        vis = {'visualType': 'slicer',
               'query': {'queryState': {'Values': {'projections': [proj(spec, label)]}}},
               'objects': objects,
               'visualContainerObjects': chrome(background=False, border=False)}
        if sync:
            vis['syncGroup'] = {'groupName': sync, 'fieldChanges': True, 'filterChanges': True}
        filters = [filter_measure_positive(vid(self.name, key + '-f'), nonempty)] if nonempty else None
        return self.add(key, x, y, w, h, vis, filters)

    def bar(self, key, x, y, w, h, title, category, values, series=None, colors=None, kind='clusteredBarChart',
            filters=None, measure_color=None, tooltips=None, labels=True, legend=True, sort=None):
        qs = {'Category': {'projections': [proj(category)]},
              'Y': {'projections': [proj(v) if isinstance(v, str) else proj(*v) for v in values]}}
        if series:
            qs['Series'] = {'projections': [proj(series)]}
        if tooltips:
            qs['Tooltips'] = {'projections': [proj(t) if isinstance(t, str) else proj(*t) for t in tooltips]}
        objects = {'labels': [{'properties': {'show': b(labels), 'fontSize': n(9)}}],
                   'legend': [{'properties': {'show': b(legend and bool(series or len(values) > 1)), 'position': s('Top')}}],
                   'valueAxis': [{'properties': {'show': b(False), 'gridlineShow': b(False)}}],
                   'categoryAxis': [{'properties': {'fontSize': n(9), 'labelColor': solid('#43586B')}}]}
        if colors:
            objects['dataPoint'] = [{'properties': {'fill': solid(c)}, 'selector': scope_equals(field, v)}
                                    for field, mapping in colors for v, c in mapping.items()]
        if measure_color:
            objects['dataPoint'] = [{'properties': {'fill': {'solid': {'color': {'expr': F(measure_color)}}}},
                                     'selector': {'data': [{'dataViewWildcard': {'matchingOption': 1}}]}}]
        query = {'queryState': qs}
        if sort:
            query['sortDefinition'] = {'sort': [{'field': F(sort[0]), 'direction': sort[1]}], 'isDefaultSort': False}
        vis = {'visualType': kind, 'query': query, 'objects': objects, 'visualContainerObjects': chrome(title=title)}
        return self.add(key, x, y, w, h, vis, filters)

    def table(self, key, x, y, w, h, title, columns, filters=None, sort=None):
        query = {'queryState': {'Values': {'projections': [proj(c) if isinstance(c, str) else proj(*c) for c in columns]}}}
        if sort:
            query['sortDefinition'] = {'sort': [{'field': F(sort[0]), 'direction': sort[1]}], 'isDefaultSort': False}
        vis = {'visualType': 'tableEx', 'query': query,
               'objects': {'columnHeaders': [{'properties': {'fontSize': n(9), 'fontColor': solid('#7A8C9C'), 'backColor': solid('#F6F8FA')}}],
                           'values': [{'properties': {'fontSize': n(9), 'wordWrap': b(True)}}],
                           'grid': [{'properties': {'gridHorizontal': b(True), 'gridVertical': b(False)}}]},
               'visualContainerObjects': chrome(title=title)}
        return self.add(key, x, y, w, h, vis, filters)

    def json(self):
        page = {'$schema': f'{SCHEMA}/page/{V_PAGE}/schema.json', 'name': self.name, 'displayName': self.display,
                'displayOption': 'FitToWidth', 'height': self.height, 'width': W,
                'objects': {'background': [{'properties': {'color': solid('#EDF1F4'), 'transparency': n(0)}}],
                            'outspace': [{'properties': {'color': solid('#EDF1F4')}}]}}
        if self.filters:
            page['filterConfig'] = {'filters': self.filters}
        return page


# --------------------------------------------------------------------------- shared page parts

def header(p, subtitle_spec):
    p.text('title', M, 14, 760, 64, [[('TECHNICAL ASSISTANCE REQUEST AND IMPLEMENTATION', 8, '#1CABE2', True)],
                                      [('TA Performance Management Dashboard', 20, INK, True)]])
    p.note('asof', 820, 30, W - M - 820, 30, subtitle_spec, size=9, color=MUTED)


def slicers(p, with_delivery, nonempty):
    y = 84
    widths = [('type', 'DimType[Request type]', 'Request type', 'Type', 170),
              ('practice', 'DimPractice[Practice]', 'Practice / sector', 'Practice', 235),
              ('region', 'DimOffice[Region]', 'Region', 'Region', 160),
              ('office', 'DimOffice[Office]', 'Country office', 'Office', 200),
              ('offer', 'DimOffer[Programme offer]', 'Programme offer', 'Offer', 300)]
    x = M
    for key, spec, label, sync, w in widths:
        p.slicer('sl-' + key, x, y, w, spec, label, sync, nonempty)
        x += w + GAP
    if with_delivery:
        p.slicer('sl-status', M, y + 62, 300, 'Requests[Status]', 'Implementation status', 'Status', nonempty)
        p.slicer('sl-quarter', M + 312, y + 62, 300, 'Requests[Expected completion quarter]', 'Expected completion quarter', 'Quarter', nonempty)
        return y + 62 + 56 + 10
    return y + 56 + 10


def kpi_row(p, y, items, h=86):
    w = (INNER - GAP * (len(items) - 1)) / len(items)
    for i, (key, label, value, sub, color) in enumerate(items):
        p.kpi(key, round(M + i * (w + GAP)), y, round(w), label, value, sub, color, h=h)
    return y + h + 34 + 16


# --------------------------------------------------------------------------- Performance

def performance():
    p = Page('performance', 'Performance', 2900)
    p.filters.append(filter_in(vid('performance', 'scope'), 'Requests[In performance scope]', ['Yes']))
    header(p, 'Requests.[As of label]')
    y = slicers(p, True, 'Requests.[Total requests]')
    p.note('summary', M, y, INNER, 30, 'Requests.[Filter summary]', size=14, color=INK)
    p.note('showing', M, y + 30, INNER, 24, 'Requests.[Showing requests]', size=10, color=MUTED)
    y += 66
    y = kpi_row(p, y, [
        ('k-total', 'Total requests', 'Requests.[Total requests (card)]', 'Requests.[Total requests sub]', INK),
        ('k-split', 'Big ticket · routine', 'Requests.[Big ticket vs routine]', 'Requests.[Big ticket vs routine sub]', INK),
        ('k-recv', 'Received last 30 days', 'Requests.[Received in last 30 days (card)]', 'Requests.[Received last 30 days sub]', INK),
        ('k-track', 'Active & on track', 'Requests.[Active & on track (card)]', 'Requests.[Active & on track sub]', '#3E9CD6'),
        ('k-done', 'Completed', 'Requests.[Completed (card)]', 'Requests.[Completed sub]', GREEN),
        ('k-over', 'Overdue', 'Requests.[Overdue (card)]', 'Requests.[Overdue sub]', RED),
    ])

    p.text('stands', M, y, INNER, 30, [[('Where the work stands', 13, INK, True)],
                                       [('Pick a metric to break it down by practice. Received in the last 30 days is a subset, to show inflow.', 9, MUTED, False)]])
    y += 44
    p.slicer('sl-metric', M, y, 260, "'Portfolio metric'[Metric]", 'Metric', None, None, h=300, single=True, mode='Basic')
    p.bar('metric-practice', M + 272, y, INNER - 272, 300, 'Selected metric by practice', 'DimPractice[Practice]',
          [('Requests.[Selected metric]', 'Requests')], tooltips=[('Requests.[Selected metric share of practice]', "Share of the practice's requests")])
    p.note('coverage', M, y + 306, INNER, 40, 'Requests.[Coverage note]', size=9)
    y += 360

    p.heading('h1', y, 1, 'Demand, delivery & status')
    y += 44
    p.bar('io', M, y, 780, 320, 'Requests opened vs. completed, by month (2026)', 'DimMonth[Month label]',
          [('Requests.[Opened in month]', 'Opened'), ('Requests.[Completed in month]', 'Completed')],
          kind='clusteredColumnChart', sort=('DimMonth[Month label]', 'Ascending'))
    p.note('io-note', M, y + 322, 780, 26, 'Requests.[Opened vs completed note]', size=9)
    p.bar('severity', M + 792, y, INNER - 792, 220, 'Overdue severity', 'Requests[Overdue bucket]',
          [('Requests.[Overdue]', 'Overdue requests')], colors=[('Requests[Overdue bucket]', BUCKET_COLORS)],
          sort=('Requests[Overdue bucket]', 'Ascending'))
    p.note('severity-note', M + 792, y + 226, INNER - 792, 120, 'Requests.[Overdue severity note]', size=9, background=True, border=True)
    y += 370

    p.heading('h2', y, 2, 'Workload: practices, regions & staff')
    y += 44
    p.bar('by-practice', M, y, 780, 480, 'Requests by practice, by implementation status', 'DimPractice[Practice]',
          ['Requests.[Total requests]'], series='Requests[Status]', kind='barChart',
          colors=[('Requests[Status]', STATUS_COLORS)])
    p.table('practice-leads', M + 792, y, INNER - 792, 480, 'TAs and leads by practice',
            [('DimPractice[Practice]', 'Practice'), ('Requests.[Total requests]', 'TAs'),
             ('Requests.[TA leads]', 'Leads'), ('Requests.[Requests per lead]', 'Avg / lead')],
            sort=('Requests.[Total requests]', 'Descending'))
    y += 492
    w4 = (INNER - 3 * GAP) / 4
    for i, (key, label, spec, color) in enumerate([
            ('l-min', 'Fewest requests per TA lead', 'Requests.[Lead load min]', INK),
            ('l-avg', 'Average per TA lead', 'Requests.[Lead load average]', BLUE),
            ('l-max', 'Most requests per TA lead', 'Requests.[Lead load max]', ORANGE),
            ('l-who', 'Busiest TA lead', 'Requests.[Busiest TA lead]', INK)]):
        p.kpi(key, round(M + i * (w4 + GAP)), y, round(w4), label, spec, None, color, value_size=20 if key == 'l-who' else 26)
    p.note('workload', M, y + 90, INNER, 26, 'Requests.[Workload note]', size=9)
    y += 130

    p.heading('h3', y, 3, 'Request lists')
    y += 44
    cols = [('Requests[Request ID]', 'Case'), ('Requests[Office]', 'Country'), ('Requests[Details]', 'Details/Description'),
            ('Requests[Practice]', 'Practice'), ('Requests[Expected completion]', 'Exp. completion'),
            ('Requests[Status]', 'Status'), ('Requests[TA lead]', 'TA lead')]
    p.table('new', M, y, INNER, 400, 'New requests — received in the last 30 days',
            cols + [('Requests[Days since received]', 'Days since received')],
            filters=[filter_in(vid('performance', 'new-f'), 'Requests[Received last 30 days]', ['Yes'])],
            sort=('Requests[Days since received]', 'Ascending'))
    y += 412
    p.table('overdue', M, y, INNER, 440, 'Overdue requests — most overdue first',
            cols + [('Requests[Days past target]', 'Days over')],
            filters=[filter_in(vid('performance', 'over-f'), 'Requests[Is overdue]', ['Yes'])],
            sort=('Requests[Days past target]', 'Descending'))
    p.height = y + 460
    return p


# --------------------------------------------------------------------------- Data Quality

def data_quality():
    p = Page('dataquality', 'Data Quality Review', 3800)
    p.filters.append(filter_in(vid('dataquality', 'scope'), 'Requests[Country office request]', ['Yes']))
    header(p, 'Requests.[Data quality header]')
    y = slicers(p, True, 'Requests.[Total requests]')
    p.note('summary', M, y, INNER, 30, 'Requests.[Filter summary]', size=14, color=INK)
    p.text('intro', M, y + 30, INNER, 40, [[('The right concern for the right stage. ', 9, INK, True),
                                            ('While a request is being reviewed (Unassigned → 0%) the record is still being set up, so the concern is stalling. '
                                             'Once work starts (25%+) the record should be complete and consistent.', 9, MUTED, False)]])
    y += 80
    y = kpi_row(p, y, [
        ('k-await', 'Awaiting assignment', 'Requests.[Awaiting assignment (card)]', None, INK),
        ('k-review', 'In review (0%)', 'Requests.[In review (0%) (card)]', None, INK),
        ('k-stalled', 'Stalled in setup', 'Requests.[Stalled in setup (card)]', None, RED),
        ('k-deliv', 'In delivery (25%+)', 'Requests.[In delivery (25%+) (card)]', None, INK),
        ('k-clean', 'Needing cleanup', 'Requests.[Needing cleanup (card)]', None, RED),
        ('k-over', 'Overdue', 'Requests.[Overdue (card)]', None, RED),
    ]) - 34

    table_cols = [('Requests[Request ID]', 'Case'), ('Requests[Office]', 'Country'), ('Requests[Details]', 'Details/Description'),
                  ('Requests[Region]', 'Region'), ('Requests[Practice]', 'Practice'), ('Requests[Status]', 'Status'),
                  ('Requests[TA lead]', 'TA lead')]

    p.heading('s1', y, 1, 'Received & in review — Unassigned · 0%', BLUE)
    y += 44
    third = (INNER - 2 * GAP) / 3
    p.bar('pipeline', M, y, round(third), 200, 'Setup pipeline', 'Requests[Status]', [('Requests.[Requests in review]', 'Requests')],
          colors=[('Requests[Status]', {'Unassigned': AMBER, '0%': '#9CC6E0'})])
    p.bar('aging', round(M + third + GAP), y, round(third), 200, 'Time in setup', 'Requests[Time in setup]',
          [('Requests.[Requests in review]', 'Requests')], colors=[('Requests[Time in setup]', {'0–14 days': '#3E9CD6', '15–30 days': AMBER, '30+ days': RED})],
          sort=('Requests[Time in setup]', 'Ascending'))
    x3 = round(M + 2 * (third + GAP))
    p.kpi('ready', x3, y, round(third), 'Ready to advance', 'Requests.[Requests ready to advance (card)]', 'Requests.[Ready to advance sub]', GREEN)
    p.kpi('nolead', x3, y + 126, round(third), 'Setup contradiction: past assignment, but no TA lead',
          'Requests.[Assigned without TA lead (card)]', None, RED, h=74)
    y += 212
    p.table('review-table', M, y, INNER, 400, 'All requests in review — longest wait first',
            table_cols + [('Requests[Days waiting]', 'Days waiting'), ('Requests[Stalled]', 'Stalled')],
            filters=[filter_in(vid('dataquality', 'rev-f'), 'Requests[In review]', ['Yes'])],
            sort=('Requests[Days waiting]', 'Descending'))
    p.note('stall-note', M, y + 404, INNER, 34, 'Requests.[Stall note]', size=9)
    y += 450

    p.heading('s2', y, 2, 'Started & in delivery — 25% onwards', NAVY)
    y += 44
    p.bar('completeness', M, y, 600, 250, 'Field completeness (25%+)', "'Completeness check'[Field]",
          [('Requests.[Completeness]', 'Filled')], measure_color='Requests.[Completeness colour]',
          sort=("'Completeness check'[Field]", 'Ascending'))
    p.kpi('score', M + 612, y, 300, 'Record quality score (25%+)', 'Requests.[Record quality score]', 'Requests.[Record quality sub]', BLUE, value_size=30)
    p.kpi('placeholder', M + 924, y, INNER - 924, 'Placeholder descriptions', 'Requests.[Placeholder descriptions (card)]', None, AMBER, h=74)
    p.kpi('dups', M + 924, y + 126, INNER - 924, 'Possible duplicate requests', 'Requests.[Possible duplicates (card)]', None, AMBER, h=74)
    p.kpi('f-lead', M + 612, y + 126, 145, 'No TA lead', 'Requests.[No TA lead (25%+) (card)]', None, RED, h=74, value_size=20)
    p.kpi('f-date', M + 767, y + 126, 145, 'No target date', 'Requests.[No expected completion (25%+) (card)]', None, RED, h=74, value_size=20)
    y += 262
    p.kpi('f-start', M + 612, y - 62, 300, 'Completion target before start', 'Requests.[Target before start (25%+) (card)]', None, AMBER, h=60, value_size=18)
    p.table('cleanup-table', M, y, INNER, 400, 'Started records needing cleanup',
            table_cols + [('Requests[Data issue]', 'Missing / issue')],
            filters=[filter_in(vid('dataquality', 'cl-f1'), 'Requests[In delivery stage]', ['Yes']),
                     filter_in(vid('dataquality', 'cl-f2'), 'Requests[Passes all checks]', ['No'])],
            sort=('Requests[Data issue]', 'Ascending'))
    y += 420

    p.heading('s3', y, 3, 'Overdue, at-risk & closure', RED)
    y += 44
    p.kpi('o-count', M, y, 300, 'Overdue', 'Requests.[Overdue (card)]', None, RED, h=74)
    p.kpi('o-risk', M, y + 86, 300, 'Upcoming closure (next 30 days)', 'Requests.[Requests due in next 30 days (card)]', None, AMBER, h=74)
    p.kpi('o-close', M, y + 172, 300, 'Completed or discontinued, not closed', 'Requests.[Should be closed (card)]', None, AMBER, h=74)
    p.bar('o-sev', M + 312, y, INNER - 312, 246, 'Overdue severity — how far past the target date', 'Requests[Overdue bucket]',
          [('Requests.[Overdue]', 'Overdue requests')], colors=[('Requests[Overdue bucket]', BUCKET_COLORS)],
          sort=('Requests[Overdue bucket]', 'Ascending'))
    y += 258
    half = (INNER - GAP) / 2
    p.table('o-table', M, y, round(half), 400, 'Most overdue active requests',
            [('Requests[Request ID]', 'Case'), ('Requests[Office]', 'Country'), ('Requests[Practice]', 'Practice'),
             ('Requests[Status]', 'Status'), ('Requests[TA lead]', 'TA lead'), ('Requests[Days past target]', 'Days over')],
            filters=[filter_in(vid('dataquality', 'ov-f'), 'Requests[Is overdue]', ['Yes'])],
            sort=('Requests[Days past target]', 'Descending'))
    p.table('nc-table', round(M + half + GAP), y, round(half), 400, 'Completed or discontinued, but not closed',
            [('Requests[Request ID]', 'Case'), ('Requests[Office]', 'Country'), ('Requests[Practice]', 'Practice'),
             ('Requests[Status]', 'Status'), ('Requests[TA lead]', 'TA lead'), ('Requests[Not closed reason]', 'Reason')],
            filters=[filter_in(vid('dataquality', 'nc-f'), 'Requests[Not closed]', ['Yes'])])
    p.note('o-note', M, y + 404, INNER, 26, 'Requests.[Overdue note]', size=9)
    y += 444

    p.heading('s4', y, 4, 'Summary of where requests sit', GREEN)
    p.text('s4-intro', M, y + 36, INNER, 24, [[('The whole portfolio in one view, each request counted once. Click any segment of a bar to list those requests in the table below.', 9, MUTED, False)]])
    y += 66
    p.bar('phase', M, y, INNER, 480, 'Where every request sits, by practice', 'DimPractice[Practice]',
          ['Requests.[Requests in phase]'], series='Requests[Phase]', kind='barChart',
          colors=[('Requests[Phase]', PHASE_COLORS)])
    p.note('phase-note', M, y + 484, INNER, 40, 'Requests.[Phase note]', size=9)
    y += 532
    p.table('phase-table', M, y, INNER, 460, 'Requests by phase — click a bar segment above to filter',
            table_cols + [('Requests[Phase]', 'Phase'), ('Requests[Phase detail]', 'Days / target')],
            filters=[filter_in(vid('dataquality', 'ph-f'), 'Requests[Phase]', list(PHASE_COLORS))],
            sort=('Requests[Phase]', 'Ascending'))
    p.height = y + 480
    return p


# --------------------------------------------------------------------------- Feedback

def feedback():
    p = Page('feedback', 'Feedback', 3600)
    header(p, 'Requests.[As of label]')
    y = slicers(p, False, 'Survey.[Responses]')
    p.note('summary', M, y, INNER, 30, 'Survey.[Feedback filter summary]', size=14, color=INK)
    p.note('showing', M, y + 30, INNER, 24, 'Survey.[Showing responses]', size=10, color=MUTED)
    y += 66
    y = kpi_row(p, y, [
        ('k-resp', 'Survey responses', 'Survey.[Responses (card)]', 'Survey.[Responses sub]', INK),
        ('k-written', 'Written comments', 'Survey.[Written comments (card)]', 'Survey.[Written sub]', INK),
        ('k-subst', 'Substantive comments', 'Survey.[Substantive comments (card)]', None, INK),
        ('k-imp', 'Improvement opportunities', 'Survey.[Improvement opportunities (card)]', 'Survey.[Improvement sub]', '#B77A10'),
        ('k-flags', 'Data-quality flags', 'Survey.[Data-quality flags (card)]', 'Survey.[Flags sub]', RED),
    ])
    quarter = (INNER - 3 * GAP) / 4
    for i, (key, label, value, stars, color) in enumerate([
            ('r-sat', 'Overall satisfaction (out of 5)', 'Survey.[Average satisfaction]', 'Survey.[Satisfaction stars]', '#B77A10'),
            ('r-qual', 'Quality of the assistance (out of 5)', 'Survey.[Average quality]', 'Survey.[Quality stars]', INK),
            ('r-time', 'Timeliness (out of 5)', 'Survey.[Average timeliness]', 'Survey.[Timeliness stars]', INK),
            ('r-rec', 'Would recommend (out of 10)', 'Survey.[Average recommend]', 'Survey.[Recommend stars]', INK)]):
        x = round(M + i * (quarter + GAP))
        p.kpi(key, x, y, round(quarter), label, value, None, color, value_size=30 if i == 0 else 24)
        p.note(key + '-stars', x, y + 86, round(quarter), 30, stars, size=14, color=AMBER, background=True)
    p.note('rated', M, y + 116, INNER, 22, 'Survey.[Rated sub]', size=9, color=FAINT)
    y += 150

    p.heading('f1', y, 1, 'Who responded')
    p.note('typeline', M, y + 36, INNER, 40, 'Survey.[Type line]', size=10)
    y += 84
    scatter = {
        'visualType': 'scatterChart',
        'query': {'queryState': {
            'Category': {'projections': [proj('Survey[Survey office]', 'Office')]},
            'X': {'projections': [proj('Survey.[Map longitude]', 'Longitude')]},
            'Y': {'projections': [proj('Survey.[Map latitude]', 'Latitude')]},
            'Size': {'projections': [proj('Survey.[Responses]', 'Responses')]},
            'Tooltips': {'projections': [proj('Survey.[Average satisfaction]', 'Satisfaction'),
                                         proj('Survey.[Average quality]', 'Quality'),
                                         proj('Survey.[Average timeliness]', 'Timeliness')]}}},
        'objects': {
            'categoryAxis': [{'properties': {'show': b(False), 'start': n(-180), 'end': n(180), 'gridlineShow': b(False)}}],
            'valueAxis': [{'properties': {'show': b(False), 'start': n(-50.4), 'end': n(61.92), 'gridlineShow': b(False)}}],
            'categoryLabels': [{'properties': {'show': b(False)}}],
            'legend': [{'properties': {'show': b(False)}}],
            'dataPoint': [{'properties': {'fill': {'solid': {'color': {'expr': F('Survey.[Rating colour]')}}}},
                           'selector': {'data': [{'dataViewWildcard': {'matchingOption': 1}}]}}],
            'plotArea': [{'properties': {'image': {'image': {
                'name': s('WorldMap.png'),
                'url': {'expr': {'ResourcePackageItem': {'PackageName': 'RegisteredResources', 'PackageType': 1, 'ItemName': 'WorldMap.png'}}},
                'scaling': s('Fit')}}, 'transparency': n(0)}}],
        },
        'visualContainerObjects': chrome(title='Where responses came from — size is responses, colour is average rating; click a bubble to read its comments'),
    }
    # plot area ~3.2:1, the background image's ratio, so the map is not stretched
    p.add('map', M, y, 860, 312, scatter)
    p.table('offices', M + 872, y, INNER - 872, 312, 'By country office',
            [('Survey[Survey office]', 'Office'), ('Survey.[Responses]', 'Responses'),
             ('Survey.[Average satisfaction]', 'Satisfaction'), ('Survey.[Average quality]', 'Quality'),
             ('Survey.[Average timeliness]', 'Timeliness')], sort=('Survey.[Responses]', 'Descending'))
    p.text('legend', M, y + 316, INNER, 22, [[('Average satisfaction:  ', 9, MUTED, True), ('● 4.5–5.0   ', 9, GREEN, True),
                                              ('● 4.0–4.5   ', 9, '#5FA98A', True), ('● 3.5–4.0   ', 9, AMBER, True),
                                              ('● below 3.5   ', 9, RED, True), ('● no rating', 9, '#AEBCC7', True)]])
    y += 350

    p.heading('f2', y, 2, 'What is working well', GREEN)
    y += 44
    p.kpi('pos-n', M, y, 300, 'Pieces of positive feedback', "SurveyThemes.[Positive feedback (card)]", None, GREEN, value_size=34)
    p.kpi('pos-c', M + 312, y, 300, 'Comments with positive feedback', 'Survey.[Comments with positive feedback (card)]', None, GREEN)
    p.kpi('pos-top', M + 624, y, INNER - 624, 'Most mentioned', 'SurveyThemes.[Top positive theme]', None, GREEN, value_size=18)
    p.note('pos-note', M, y + 90, INNER, 30, 'SurveyThemes.[Positive feedback note]', size=10, color='#1F5C43')
    y += 128
    p.table('pos-quotes', M, y, INNER, 200, 'In their words',
            [('Survey[Featured quote]', 'Quote'), ('Survey[Survey office]', 'Office'), ('Survey[Request type]', 'Case type')],
            filters=[filter_in(vid('feedback', 'pq-f'), 'Survey[Featured quote tone]', ['Positive'])])
    y += 212
    p.bar('pos-themes', M, y, INNER, 300, 'Positive feedback, by case type — one comment can carry several themes; click a segment to read those comments',
          'SurveyThemes[Theme]', [('SurveyThemes.[Theme mentions]', 'Mentions')], series='DimType[Request type]', kind='barChart',
          colors=[('DimType[Request type]', TYPE_COLORS)],
          filters=[filter_in(vid('feedback', 'pt-f'), 'SurveyThemes[Kind]', ['Positive'])])
    y += 320

    p.heading('f3', y, 3, 'What to improve', AMBER)
    y += 44
    p.kpi('imp-n', M, y, 300, 'Specific things colleagues asked us to change', 'Survey.[Improvement opportunities (card)]', None, '#B77A10', value_size=34)
    p.note('imp-note', M + 312, y, INNER - 312, 86, 'SurveyThemes.[Improvement note]', size=10, color='#6E5A2E', background=True, border=True)
    y += 98
    p.table('imp-quotes', M, y, INNER, 200, 'In their words',
            [('Survey[Featured quote]', 'Quote'), ('Survey[Survey office]', 'Office'), ('Survey[Request type]', 'Case type')],
            filters=[filter_in(vid('feedback', 'iq-f'), 'Survey[Featured quote tone]', ['Improvement'])])
    y += 212
    p.bar('imp-themes', M, y, INNER, 300, 'Where colleagues asked for change — one primary theme per comment; click a bar to read those comments',
          'SurveyThemes[Theme]', [('SurveyThemes.[Theme mentions]', 'Comments')],
          colors=[], filters=[filter_in(vid('feedback', 'it-f'), 'SurveyThemes[Kind]', ['Improvement'])])
    y += 320

    p.heading('f4', y, 4, 'In their own words')
    p.text('f4-intro', M, y + 36, INNER, 24, [[('Every substantive comment, with its rating and the themes it was coded to. Selecting a bar, a bubble or a slicer above filters this list.', 9, MUTED, False)]])
    y += 66
    p.table('comments', M, y, INNER, 620, 'Substantive comments',
            [('Survey[Survey office]', 'Country office'), ('Survey[Request type]', 'Case type'), ('Survey[Practice]', 'Practice'),
             ('Survey[Rating]', 'Rating'), ('Survey[Comment]', 'Comment'), ('Survey[Themes]', 'Themes')],
            filters=[filter_in(vid('feedback', 'cm-f'), 'Survey[Substantive]', ['Yes'])])
    y += 632
    p.text('note-title', M, y, INNER, 26, [[('A note on data', 11, INK, True)]], background=True)
    p.note('data-note', M, y + 26, INNER, 90, 'Survey.[Data note]', size=9, background=True)
    p.height = y + 136
    return p


# --------------------------------------------------------------------------- report files

THEME = {
    'name': 'REACH TA',
    'dataColors': [BLUE, GREEN, AMBER, RED, '#1CABE2', NAVY, ORANGE, '#9CC6E0', '#5FA98A', '#B77A10'],
    'foreground': INK, 'foregroundNeutralSecondary': MUTED, 'background': '#FFFFFF', 'tableAccent': BLUE,
    'good': GREEN, 'neutral': AMBER, 'bad': RED,
    'textClasses': {
        'callout': {'fontSize': 26, 'fontFace': 'Segoe UI Semibold', 'color': INK},
        'title': {'fontSize': 11, 'fontFace': 'Segoe UI Semibold', 'color': INK},
        'header': {'fontSize': 11, 'fontFace': 'Segoe UI Semibold', 'color': INK},
        'label': {'fontSize': 9, 'fontFace': 'Segoe UI', 'color': '#43586B'},
    },
}


def write():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    defn = os.path.join(OUT, 'definition')
    res = os.path.join(OUT, 'StaticResources', 'RegisteredResources')
    os.makedirs(res)
    shutil.copy(os.path.join(HERE, 'assets', 'WorldMap.png'), os.path.join(res, 'WorldMap.png'))
    with open(os.path.join(res, 'ReachTheme.json'), 'w', encoding='utf-8') as f:
        json.dump(THEME, f, indent=2)

    def dump(path, obj):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(obj, f, indent=2, ensure_ascii=False)

    dump(os.path.join(OUT, 'definition.pbir'), {
        '$schema': 'https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json',
        'version': '4.0', 'datasetReference': {'byPath': {'path': f'../{NAME}.SemanticModel'}}})
    dump(os.path.join(defn, 'version.json'), {'$schema': f'{SCHEMA}/versionMetadata/{V_VERSION}/schema.json', 'version': '2.0.0'})
    dump(os.path.join(defn, 'report.json'), {
        '$schema': f'{SCHEMA}/report/{V_REPORT}/schema.json',
        'themeCollection': {'customTheme': {'name': 'ReachTheme.json',
                                            'reportVersionAtImport': {'visual': V_VISUAL, 'report': V_REPORT, 'page': V_PAGE},
                                            'type': 'RegisteredResources'}},
        'resourcePackages': [{'name': 'RegisteredResources', 'type': 'RegisteredResources', 'items': [
            {'name': 'ReachTheme.json', 'path': 'ReachTheme.json', 'type': 'CustomTheme'},
            {'name': 'WorldMap.png', 'path': 'WorldMap.png', 'type': 'Image'}]}],
        'settings': {'useStylableVisualContainerHeader': True, 'exportDataMode': 'AllowSummarized',
                     'defaultDrillFilterOtherVisuals': True, 'allowChangeFilterTypes': True, 'useEnhancedTooltips': True},
    })
    pages = [performance(), data_quality(), feedback()]
    dump(os.path.join(defn, 'pages', 'pages.json'), {'$schema': f'{SCHEMA}/pagesMetadata/{V_PAGES}/schema.json',
                                                     'pageOrder': [p.name for p in pages], 'activePageName': pages[0].name})
    for p in pages:
        dump(os.path.join(defn, 'pages', p.name, 'page.json'), p.json())
        for v in p.visuals:
            dump(os.path.join(defn, 'pages', p.name, 'visuals', v['name'], 'visual.json'), v)

    dump(os.path.join(ROOT, NAME + '.pbip'), {
        '$schema': 'https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json',
        'version': '1.0', 'artifacts': [{'report': {'path': f'{NAME}.Report'}}], 'settings': {'enableAutoRecovery': True}})
    with open(os.path.join(ROOT, '.gitignore'), 'w') as f:
        f.write('**/.pbi/localSettings.json\n**/.pbi/cache.abf\n')
    return pages


if __name__ == '__main__':
    pages = write()
    print(f'Wrote {os.path.relpath(OUT, REPO)}: ' + ', '.join(f'{p.display} ({len(p.visuals)} visuals)' for p in pages))
