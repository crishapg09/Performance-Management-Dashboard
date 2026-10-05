"""
DAX measures for the REACH TA model. Each one reproduces a figure on the web
dashboard; the comment or description names the rule it follows
(app/src/lib/dashboard.ts for Performance and Data Quality, lib/feedback.ts for
Feedback).

Base measures return BLANK when nothing matches, so a chart hides empty
categories. KPI cards use the hidden "… (card)" twins, which show 0 instead.
"""

MEASURES = []


def m(table, name, dax, fmt=None, folder=None, desc=None, hidden=False, card=False):
    MEASURES.append(dict(table=table, name=name, dax=dax, fmt=fmt, folder=folder, desc=desc, hidden=hidden))
    if card:
        MEASURES.append(dict(table=table, name=name + ' (card)', dax=f'COALESCE ( [{name}], 0 )', fmt=fmt,
                             folder='Cards', desc=None, hidden=True))


R, SV, TH = 'Requests', 'Survey', 'SurveyThemes'
P, DQ, FB, TX = 'Performance', 'Data Quality', 'Feedback', 'Text'


def count_where(*filters):
    f = ',\n    '.join(f'KEEPFILTERS ( {x} )' for x in filters)
    return f'CALCULATE (\n    COUNTROWS ( Requests ),\n    {f}\n)'


# ---------------------------------------------------------------- shared
m('Data date', 'As of', "MAX ( 'Data date'[As of] )", 'd mmm yyyy', None,
  'The date every figure is measured from: the day of the latest activity in the data.')
m(R, 'As of label', '''VAR scopeRows =
    CALCULATETABLE (
        Requests,
        REMOVEFILTERS ( DimType ), REMOVEFILTERS ( DimPractice ), REMOVEFILTERS ( DimOffer ), REMOVEFILTERS ( DimOffice ),
        REMOVEFILTERS ( Requests[Status] ), REMOVEFILTERS ( Requests[Expected completion quarter] )
    )
VAR lo = MINX ( scopeRows, Requests[Opened month] )
VAR hi = MAXX ( scopeRows, Requests[Opened month] )
RETURN
    "Created " & FORMAT ( lo, "mmm" ) & IF ( hi <> lo, "–" & FORMAT ( hi, "mmm" ) ) & " " & FORMAT ( hi, "yyyy" )
        & "  ·  as of " & FORMAT ( [As of], "d mmm yyyy" )''', None, TX)

# ---------------------------------------------------------------- Performance
m(R, 'Total requests', 'COUNTROWS ( Requests )', '#,0', P, 'Requests in the current filter.', card=True)
m(R, 'All requests in scope', '''CALCULATE (
    [Total requests],
    REMOVEFILTERS ( DimType ),
    REMOVEFILTERS ( DimPractice ),
    REMOVEFILTERS ( DimOffer ),
    REMOVEFILTERS ( DimOffice ),
    REMOVEFILTERS ( Requests[Status] ),
    REMOVEFILTERS ( Requests[Expected completion quarter] )
)''', '#,0', P, 'Requests on this page with the slicers cleared (the page scope still applies).')
m(R, 'Share of all requests', 'DIVIDE ( [Total requests], [All requests in scope] )', '0%', P)
m(R, 'Showing requests', '''"Showing " & FORMAT ( [Total requests (card)], "#,0" ) & " requests  (" & FORMAT ( COALESCE ( [Share of all requests], 0 ), "0%" ) & " of all)"''', None, TX)

m(R, 'Big ticket', count_where('Requests[Request type] = "Big Ticket"'), '#,0', P, card=True)
m(R, 'Routine', count_where('Requests[Request type] = "Routine"'), '#,0', P, card=True)
m(R, 'Big ticket vs routine', '''FORMAT ( [Big ticket (card)], "#,0" ) & " · " & FORMAT ( [Routine (card)], "#,0" )''', None, TX)
m(R, 'Big ticket vs routine sub', '''FORMAT ( DIVIDE ( [Big ticket (card)], [Total requests] ), "0%" ) & " big ticket · "
    & FORMAT ( DIVIDE ( [Routine (card)], [Total requests] ), "0%" ) & " routine"''', None, TX)

m(R, 'Received last 30 days', count_where('Requests[Received last 30 days] = "Yes"'), '#,0', P,
  'Created in the 30 days up to the as-of date.', card=True)
m(R, 'Active & on track', count_where('Requests[On track] = "Yes"'), '#,0', P,
  'In progress (not completed, discontinued or unassigned) and not past the expected completion date.', card=True)
m(R, 'Completed', count_where('Requests[Status] = "100%"'), '#,0', P, 'Reached 100%.', card=True)
m(R, 'Overdue', count_where('Requests[Is overdue] = "Yes"'), '#,0', P,
  'Not completed or discontinued, and past the expected completion date. Includes unassigned requests: '
  'an unassigned request past its target is the worst kind of overdue.', card=True)

for name, sub in (('Total requests', '"TA requests · country offices"'),
                  ('Received last 30 days', '''FORMAT ( DIVIDE ( [Received last 30 days (card)], [Total requests] ), "0%" ) & " of all requests · new since " & FORMAT ( [As of] - 30, "d mmm yyyy" )'''),
                  ('Active & on track', '''FORMAT ( DIVIDE ( [Active & on track (card)], [Total requests] ), "0%" ) & " of all requests · in progress, not overdue"'''),
                  ('Completed', '''FORMAT ( DIVIDE ( [Completed (card)], [Total requests] ), "0%" ) & " of all requests reached 100%"'''),
                  ('Overdue', '''FORMAT ( DIVIDE ( [Overdue (card)], [Total requests] ), "0%" ) & " of all requests · past target date"''')):
    m(R, name + ' sub', sub, None, TX)

m(R, 'Selected metric', '''SWITCH (
    SELECTEDVALUE ( 'Portfolio metric'[Metric], "Overdue" ),
    "Received last 30 days", [Received last 30 days],
    "Active & on track", [Active & on track],
    "Completed", [Completed],
    "Overdue", [Overdue]
)''', '#,0', P, 'The metric picked in "Where the work stands".')
m(R, 'Selected metric share of practice', '''DIVIDE ( [Selected metric], [Total requests] )''', '0%', P,
  "What share of the practice's own requests the picked metric represents.")
m(R, 'Selected metric title', '''SELECTEDVALUE ( 'Portfolio metric'[Metric], "Overdue" ) & " — by practice"''', None, TX)
m(R, 'Coverage note', '''VAR total = [Total requests (card)]
VAR covered = [Active & on track (card)] + [Overdue (card)] + [Completed (card)]
VAR rest = total - covered
RETURN
    IF (
        rest > 0,
        "On track, Overdue and Completed are mutually exclusive and together cover " & FORMAT ( covered, "#,0" )
            & " of " & FORMAT ( total, "#,0" ) & " requests; the remaining " & FORMAT ( rest, "#,0" )
            & " are unassigned and not yet past their target date, so they are still in review rather than active.",
        "On track, Overdue and Completed are mutually exclusive and together cover the whole portfolio."
    )''', None, TX)

m(R, 'Opened in month', 'COUNTROWS ( Requests )', '#,0', P,
  'Requests opened in the month on the axis (uses the Opened month relationship).')
m(R, 'Completed in month', '''CALCULATE (
    COUNTROWS ( Requests ),
    USERELATIONSHIP ( Requests[Completed month], DimMonth[Month] )
)''', '#,0', P, 'Requests that reached 100% and were closed (or resolved) in the month on the axis.')
m(R, 'Opened vs completed note', '''"Opened " & FORMAT ( SUMX ( DimMonth, [Opened in month] ) + 0, "#,0" )
    & "  ·  Completed " & FORMAT ( SUMX ( DimMonth, [Completed in month] ) + 0, "#,0" )
    & "  (April – " & FORMAT ( [As of], "mmm" ) & ")"''', None, TX)

m(R, 'Overdue severity note', '''VAR a = CALCULATE ( [Overdue (card)], Requests[Overdue bucket] = "1–30 days" )
VAR b = CALCULATE ( [Overdue (card)], Requests[Overdue bucket] = "31–60 days" )
VAR c = CALCULATE ( [Overdue (card)], Requests[Overdue bucket] = ">60 days" )
VAR biggest = IF ( a >= b && a >= c, "1–30 days", IF ( b >= c, "31–60 days", ">60 days" ) )
VAR n = IF ( a >= b && a >= c, a, IF ( b >= c, b, c ) )
RETURN
    FORMAT ( [Overdue (card)], "#,0" ) & " requests are past their expected completion date. The largest group is "
        & biggest & " late (" & FORMAT ( n, "#,0" ) & "). Anything beyond 60 days needs the expected completion date "
        & "reviewed: the original target is no longer credible, so the request should be re-planned, or closed if the work is finished."''',
  None, TX)

m(R, 'TA leads', 'DISTINCTCOUNTNOBLANK ( Requests[TA lead] )', '#,0', P, 'Distinct TA leads in the current filter.')
m(R, 'Requests per lead', 'DIVIDE ( [Total requests], [TA leads] )', '0.0', P,
  'Requests (including any without a lead) divided by distinct TA leads, as on the web dashboard.')
LEADS = '''VAR leads =
    ADDCOLUMNS (
        FILTER ( VALUES ( Requests[TA lead] ), NOT ISBLANK ( Requests[TA lead] ) ),
        "@n", CALCULATE ( COUNTROWS ( Requests ) )
    )'''
m(R, 'Lead load min', LEADS + '\nRETURN MINX ( leads, [@n] )', '#,0', P, 'Fewest requests held by one TA lead.')
m(R, 'Lead load max', LEADS + '\nRETURN MAXX ( leads, [@n] )', '#,0', P, 'Most requests held by one TA lead.')
m(R, 'Lead load average', LEADS + '\nRETURN AVERAGEX ( leads, [@n] )', '0.0', P, 'Average requests per TA lead.')
m(R, 'Busiest TA lead', LEADS + '''
VAR topN = MAXX ( leads, [@n] )
RETURN CONCATENATEX ( TOPN ( 1, FILTER ( leads, [@n] = topN ), Requests[TA lead], ASC ), Requests[TA lead] )''', None, P)
m(R, 'Leads at minimum', LEADS + '''
VAR low = MINX ( leads, [@n] )
VAR k = COUNTROWS ( FILTER ( leads, [@n] = low ) )
RETURN FORMAT ( k, "#,0" ) & IF ( k = 1, " staff member", " staff members" )''', None, TX)
m(R, 'Workload note', '''FORMAT ( [TA leads] + 0, "#,0" ) & " TA leads hold these requests. Fewest: " & FORMAT ( [Lead load min] + 0, "#,0" )
    & " (" & [Leads at minimum] & ")  ·  average " & FORMAT ( [Lead load average] + 0, "0.0" )
    & "  ·  most: " & FORMAT ( [Lead load max] + 0, "#,0" ) & " (" & [Busiest TA lead] & ")"''', None, TX)

# ---------------------------------------------------------------- Data Quality
m(R, 'Awaiting assignment', count_where('Requests[Status] = "Unassigned"'), '#,0', DQ, 'Unassigned country office requests.', card=True)
m(R, 'In review (0%)', count_where('Requests[Status] = "0%"'), '#,0', DQ, 'At 0%: being scoped with the country office.', card=True)
m(R, 'In review', count_where('Requests[In review] = "Yes"'), '#,0', DQ, 'Unassigned or 0%.', card=True)
m(R, 'Stalled in setup', count_where('Requests[Stalled] = "Yes"'), '#,0', DQ,
  'Unassigned for more than 14 days, or at 0% and not updated in 30.', card=True)
m(R, 'In delivery (25%+)', count_where('Requests[Status] IN { "25%", "50%", "75%" }'), '#,0', DQ, 'Work has started (25%–75%).', card=True)
m(R, 'Delivery-stage requests', count_where('Requests[In delivery stage] = "Yes"'), '#,0', DQ, '25%, 50%, 75% or 100%: completeness checks apply.', card=True)
m(R, 'Passing every check', count_where('Requests[Passes all checks] = "Yes"'), '#,0', DQ, card=True)
m(R, 'Needing cleanup', count_where('Requests[In delivery stage] = "Yes"', 'Requests[Passes all checks] = "No"'), '#,0', DQ,
  '25%+ requests that fail at least one check.', card=True)
m(R, 'Record quality score', '''VAR n = [Passing every check (card)]
VAR d = [Delivery-stage requests]
RETURN
    IF ( d > 0, IF ( n >= d, 1, MIN ( 0.99, ROUND ( DIVIDE ( n, d ) * 100, 0 ) / 100 ) ) )''', '0%', DQ,
  'Share of 25%+ requests passing every check. Never rounds up to 100%: one failing record still shows.')
m(R, 'Record quality sub', '''FORMAT ( [Passing every check (card)], "#,0" ) & " of " & FORMAT ( [Delivery-stage requests (card)], "#,0" ) & " pass every check"''', None, TX)
m(R, 'Ready to advance', count_where('Requests[Ready to advance] = "Yes"'), '#,0', DQ,
  'At 0% with a description, a TA lead and a target date.', card=True)
m(R, 'Ready to advance sub', '''"of " & FORMAT ( [In review (0%) (card)], "#,0" ) & " at 0% have a description, a TA lead and a target date"''', None, TX)
m(R, 'Assigned without TA lead', count_where('Requests[Assigned without lead] = "Yes"'), '#,0', DQ,
  'At 0% (past assignment) but no TA lead.', card=True)

m(R, 'Completeness', '''VAR d = [Delivery-stage requests]
VAR n =
    SWITCH (
        SELECTEDVALUE ( 'Completeness check'[Field] ),
        "TA lead", CALCULATE ( [Delivery-stage requests], NOT ISBLANK ( Requests[TA lead] ) ),
        "Expected completion", CALCULATE ( [Delivery-stage requests], NOT ISBLANK ( Requests[Expected completion] ) ),
        "Details/Description", CALCULATE ( [Delivery-stage requests], Requests[Has description] = "Yes" ),
        "Modality", CALCULATE ( [Delivery-stage requests], Requests[Modality] <> "" ),
        "Programme offer", CALCULATE ( [Delivery-stage requests], Requests[Offer as recorded] <> "" )
    ) + 0
RETURN
    IF ( d > 0, IF ( n >= d, 1, MIN ( 0.99, ROUND ( DIVIDE ( n, d ) * 100, 0 ) / 100 ) ) )''', '0%', DQ,
  'Share of 25%+ requests with the field (row of Completeness check) filled. Never rounds up to 100%.')
m(R, 'Completeness colour', '''VAR p = [Completeness]
RETURN SWITCH ( TRUE (), p >= 0.95, "#2E7D5B", p >= 0.8, "#3E9CD6", "#E0A21E" )''', None, TX)

m(R, 'No TA lead (25%+)', count_where('Requests[In delivery stage] = "Yes"', 'ISBLANK ( Requests[TA lead] )'), '#,0', DQ, card=True)
m(R, 'No expected completion (25%+)', count_where('Requests[In delivery stage] = "Yes"', 'ISBLANK ( Requests[Expected completion] )'), '#,0', DQ, card=True)
m(R, 'Target before start (25%+)', count_where('Requests[In delivery stage] = "Yes"', 'Requests[Target before start] = "Yes"'), '#,0', DQ, card=True)
m(R, 'Placeholder descriptions', count_where('Requests[Placeholder description] = "Yes"', 'Requests[Status] <> "Discontinued"'), '#,0', DQ,
  'Descriptions that are placeholder text ("test", "please add a description", "N/A"…) on requests still in play.', card=True)
m(R, 'Possible duplicates', count_where('Requests[Possible duplicate] = "Yes"'), '#,0', DQ,
  'Later requests with the same Requested For and short description as an earlier one.', card=True)
m(R, 'Due in next 30 days', count_where('Requests[Due in next 30 days] = "Yes"'), '#,0', DQ,
  'Active requests whose expected completion date falls in the next 30 days.', card=True)
m(R, 'Should be closed', count_where('Requests[Not closed] = "Yes"'), '#,0', DQ,
  'Completed or discontinued, but with no Closed date.', card=True)
m(R, 'Requests in phase', count_where('NOT ISBLANK ( Requests[Phase] )'), '#,0', DQ,
  'Requests counted once in their lifecycle phase (discontinued excluded).')
m(R, 'Past target, not started', '''VAR d = [As of]
RETURN
    CALCULATE (
        COUNTROWS ( Requests ),
        KEEPFILTERS ( Requests[In review] = "Yes" ),
        KEEPFILTERS ( Requests[Expected completion] < d )
    ) + 0''', '#,0', DQ, 'In review (Unassigned or 0%) but already past the expected completion date.')
m(R, 'Phase note', '''"Each request is counted once, in the phase it is in. Overdue here means a request that has started (25%+) and is past "
    & "its expected completion date. " & FORMAT ( [Past target, not started], "#,0" ) & " requests are past their target date "
    & "but have not started yet — they are counted as in review, which is why this red segment is smaller than the Overdue card above."''',
  None, TX)
m(R, 'Requests with no office', '''CALCULATE (
    COUNTROWS ( Requests ),
    REMOVEFILTERS ( Requests[Country office request] ),
    ISBLANK ( Requests[Office] )
) + 0''', '#,0', DQ, 'Requests in the whole export with no country office recorded.')
m(R, 'Data quality header', '''FORMAT ( [Total requests (card)], "#,0" ) & " country office requests  ·  "
    & FORMAT ( [Requests with no office], "#,0" ) & " with no country office recorded (not shown)"''', None, TX)
m(R, 'Stall note', '''"Every request still in review, longest wait first. Days waiting = as-of date (" & FORMAT ( [As of], "dd mmm yyyy" )
    & ") − last Updated date (for Unassigned, − the date received). Stalled = Unassigned over 14 days, or 0% not updated in 30. "
    & "Stage-transition dates are not captured yet, so this is a proxy for time in the current stage."''', None, TX)
m(R, 'Overdue note', '''"Days overdue = as-of date (" & FORMAT ( [As of], "dd mmm yyyy" ) & ") − Expected Completion Date. "
    & "If this looks too high, the TA lead should update the Expected Completion Date on the request."''', None, TX)

# filter summary (Performance and Data Quality)
FILTER_PARTS = '''VAR typ = IF ( ISFILTERED ( DimType[Request type] ), CONCATENATEX ( VALUES ( DimType[Request type] ), DimType[Request type], ", " ) & " requests", "All requests" )
VAR reg = IF ( ISFILTERED ( DimOffice[Region] ), CONCATENATEX ( VALUES ( DimOffice[Region] ), DimOffice[Region], ", " ), "all regions" )
VAR pra = IF ( ISFILTERED ( DimPractice[Practice] ), "  ·  " & CONCATENATEX ( VALUES ( DimPractice[Practice] ), DimPractice[Practice], ", " ) )
VAR off = IF ( ISFILTERED ( DimOffice[Office] ), "  ·  " & CONCATENATEX ( VALUES ( DimOffice[Office] ), DimOffice[Office], ", " ) )
VAR ofr = IF ( ISFILTERED ( DimOffer[Programme offer] ), "  ·  " & CONCATENATEX ( VALUES ( DimOffer[Programme offer] ), DimOffer[Programme offer], ", " ) )'''
m(R, 'Filter summary', FILTER_PARTS + '''
VAR sts = IF ( ISFILTERED ( Requests[Status] ), "  ·  " & CONCATENATEX ( VALUES ( Requests[Status] ), Requests[Status], ", " ) & " status" )
VAR qtr = IF ( ISFILTERED ( Requests[Expected completion quarter] ), "  ·  due " & CONCATENATEX ( VALUES ( Requests[Expected completion quarter] ), Requests[Expected completion quarter], ", " ) )
VAR anyFilter = ISFILTERED ( DimType[Request type] ) || ISFILTERED ( DimOffice[Region] ) || ISFILTERED ( DimPractice[Practice] )
    || ISFILTERED ( DimOffice[Office] ) || ISFILTERED ( DimOffer[Programme offer] ) || ISFILTERED ( Requests[Status] )
    || ISFILTERED ( Requests[Expected completion quarter] )
RETURN
    IF ( anyFilter, typ & "  ·  " & reg & pra & off & ofr & sts & qtr, "All TA requests — every region, practice & status" )''', None, TX)

# ---------------------------------------------------------------- Feedback
m(SV, 'Responses', 'COUNTROWS ( Survey )', '#,0', FB, 'Survey responses in the current filter.', card=True)
m(SV, 'Written comments', "CALCULATE ( COUNTROWS ( Survey ), KEEPFILTERS ( Survey[Written] = \"Yes\" ) )", '#,0', FB, card=True)
m(SV, 'Substantive comments', "CALCULATE ( COUNTROWS ( Survey ), KEEPFILTERS ( Survey[Substantive] = \"Yes\" ) )", '#,0', FB,
  'Written comments other than "N/A" and similar non-answers.', card=True)
m(SV, 'Improvement opportunities', "CALCULATE ( COUNTROWS ( Survey ), KEEPFILTERS ( NOT ISBLANK ( Survey[Improvement theme] ) ) )", '#,0', FB,
  'Responses coded to an improvement theme.', card=True)
m(SV, 'Data-quality flags', "CALCULATE ( COUNTROWS ( Survey ), KEEPFILTERS ( NOT ISBLANK ( Survey[Data quality flag] ) ) )", '#,0', FB,
  'Responses about requests that were cancelled, misassigned or could not be evaluated.', card=True)
m(SV, 'Offices responding', 'DISTINCTCOUNTNOBLANK ( Survey[Survey office] )', '#,0', FB)
m(SV, 'All responses', 'CALCULATE ( [Responses], REMOVEFILTERS ( DimType ), REMOVEFILTERS ( DimPractice ), REMOVEFILTERS ( DimOffer ), REMOVEFILTERS ( DimOffice ) )', '#,0', FB)
m(SV, 'Showing responses', '''"Showing " & FORMAT ( [Responses (card)], "#,0" ) & " survey responses  (" & FORMAT ( DIVIDE ( [Responses (card)], [All responses] ), "0%" ) & " of all)"''', None, TX)
m(SV, 'Feedback filter summary', FILTER_PARTS + '''
VAR anyFilter = ISFILTERED ( DimType[Request type] ) || ISFILTERED ( DimOffice[Region] ) || ISFILTERED ( DimPractice[Practice] )
    || ISFILTERED ( DimOffice[Office] ) || ISFILTERED ( DimOffer[Programme offer] )
RETURN
    IF ( anyFilter, typ & "  ·  " & reg & pra & off & ofr, "All survey responses — every request type, region & practice" )''', None, TX)

m(SV, 'Responses sub', '''"across " & FORMAT ( [Offices responding], "#,0" ) & " country offices"''', None, TX)
m(SV, 'Written sub', '''FORMAT ( DIVIDE ( [Written comments (card)], [Responses] ), "0%" ) & " of respondents wrote something"''', None, TX)
m(SV, 'Improvement sub', '''IF ( [Written comments (card)] > 0, FORMAT ( DIVIDE ( [Improvement opportunities (card)], [Written comments] ), "0%" ) & " of comments name something to fix", "no written comments" )''', None, TX)
m(SV, 'Flags sub', '''VAR f = CALCULATETABLE ( VALUES ( SurveyThemes[Theme] ), SurveyThemes[Kind] = "Data-quality flag" )
RETURN IF ( COUNTROWS ( f ) > 0, CONCATENATEX ( f, LOWER ( SurveyThemes[Theme] ), ", " ), "none for this selection" )''', None, TX)

for key, col, label in (('satisfaction', 'Satisfaction', 'Overall satisfaction'), ('quality', 'Quality', 'Quality of the assistance'),
                        ('timeliness', 'Timeliness', 'Timeliness')):
    m(SV, f'Average {key}', f'AVERAGE ( Survey[{col}] )', '0.00', FB, f'{label}, 1–5 (unrated answers such as "Too early to say" are left out).')
    m(SV, f'{col} stars', f'''VAR v = [Average {key}]
VAR k = ROUND ( v, 0 )
RETURN IF ( ISBLANK ( v ), "not rated", REPT ( "★", k ) & REPT ( "☆", 5 - k ) )''', None, TX)
m(SV, 'Average recommend', 'AVERAGE ( Survey[Recommend] )', '0.0', FB, 'Would recommend, 0–10.')
m(SV, 'Recommend stars', '''VAR v = [Average recommend] / 2
VAR k = ROUND ( v, 0 )
RETURN IF ( ISBLANK ( v ), "not rated", REPT ( "★", k ) & REPT ( "☆", 5 - k ) )''', None, TX)
m(SV, 'Rated responses', 'COUNT ( Survey[Satisfaction] )', '#,0', FB)
m(SV, 'Rated sub', '''FORMAT ( [Rated responses] + 0, "#,0" ) & " rated responses"''', None, TX)
m(SV, 'Rating colour', '''VAR v = [Average satisfaction]
RETURN
    SWITCH ( TRUE (), ISBLANK ( v ), "#AEBCC7", v >= 4.5, "#2E7D5B", v >= 4, "#5FA98A", v >= 3.5, "#E0A21E", "#C0453F" )''',
  None, TX, 'Map bubble colour: 4.5+ dark green, 4.0–4.5 green, 3.5–4.0 amber, below 3.5 red, grey = no rating.')
m(SV, 'Map longitude', 'AVERAGE ( Survey[Longitude] )', '0.00', FB, hidden=True)
m(SV, 'Map latitude', 'AVERAGE ( Survey[Latitude] )', '0.00', FB, hidden=True)

m(TH, 'Theme mentions', 'COUNTROWS ( SurveyThemes )', '#,0', FB, 'Times a theme was coded (a comment can carry several positive themes).')
m(TH, 'Positive feedback', 'CALCULATE ( [Theme mentions], KEEPFILTERS ( SurveyThemes[Kind] = "Positive" ) )', '#,0', FB,
  'Pieces of positive feedback: every positive theme coded, across all comments.', card=True)
m(SV, 'Comments with positive feedback', "CALCULATE ( COUNTROWS ( Survey ), KEEPFILTERS ( Survey[Has positive feedback] = \"Yes\" ) )", '#,0', FB,
  'Respondents whose comment named at least one thing that worked.', card=True)
m(TH, 'Top positive theme', '''VAR t =
    ADDCOLUMNS ( CALCULATETABLE ( VALUES ( SurveyThemes[Theme] ), SurveyThemes[Kind] = "Positive" ), "@n", CALCULATE ( [Theme mentions], SurveyThemes[Kind] = "Positive" ) )
VAR topRow = TOPN ( 1, t, [@n], DESC, SurveyThemes[Theme], ASC )
RETURN
    IF ( COUNTROWS ( t ) > 0, FORMAT ( MAXX ( topRow, [@n] ), "#,0" ) & " on " & LOWER ( CONCATENATEX ( topRow, SurveyThemes[Theme] ) ) )''', None, TX)
m(TH, 'Positive feedback note', '''VAR w = [Written comments (card)]
RETURN
    IF (
        w = 0,
        "No written comments for this selection.",
        "Across " & FORMAT ( w, "#,0" ) & " written comments from " & FORMAT ( [Offices responding], "#,0" ) & " country offices. "
            & FORMAT ( DIVIDE ( [Comments with positive feedback (card)], w ), "0%" ) & " of people who wrote something took the time to name what worked."
    )''', None, TX)
m(TH, 'Improvement note', '''VAR w = [Written comments (card)]
VAR i = [Improvement opportunities (card)]
VAR t =
    ADDCOLUMNS (
        CALCULATETABLE ( VALUES ( SurveyThemes[Theme] ), SurveyThemes[Kind] = "Improvement", SurveyThemes[Theme is other] = 0 ),
        "@n", CALCULATE ( [Theme mentions], SurveyThemes[Kind] = "Improvement" )
    )
VAR top2 = SUMX ( TOPN ( 2, t, [@n], DESC, SurveyThemes[Theme], ASC ), [@n] )
VAR noFix = FORMAT ( DIVIDE ( w - i, w ), "0%" ) & " of written comments raised nothing to fix at all. "
RETURN
    SWITCH (
        TRUE (),
        w = 0, "No written comments for this selection.",
        i = 0, "None of the written comments for this selection raised anything to fix.",
        i < 10, noFix & "Too few asked for change here to rank the themes with confidence — read them in the table below.",
        noFix & "Of those that did, " & FORMAT ( DIVIDE ( top2, i ), "0%" )
            & " point at the same two things — so a small number of changes would answer a large share of them."
    )''', None, TX)
m(SV, 'Type line', '''VAR r = CALCULATE ( [Responses], Survey[Request type] = "Routine" ) + 0
VAR b = CALCULATE ( [Responses], Survey[Request type] = "Big Ticket" ) + 0
VAR u = CALCULATE ( [Responses], Survey[Request type] = "Unclassified" ) + 0
RETURN
    FORMAT ( [Responses (card)], "#,0" ) & " responses from " & FORMAT ( [Offices responding], "#,0" ) & " country offices — "
        & FORMAT ( r, "#,0" ) & " Routine, " & FORMAT ( b, "#,0" ) & " Big Ticket"
        & IF ( u > 0, ", " & FORMAT ( u, "#,0" ) & " not matched to a request" ) & ". "
        & "Each response is matched to the request it rates by case number, so the slicers above apply here."''', None, TX)
m(SV, 'Data note', '''VAR f = [Data-quality flags (card)]
VAR matched = CALCULATE ( [Responses], Survey[Matched to request] = "Yes", REMOVEFILTERS ( DimType ), REMOVEFILTERS ( DimPractice ), REMOVEFILTERS ( DimOffer ), REMOVEFILTERS ( DimOffice ) )
RETURN
    IF ( f > 0,
        FORMAT ( f, "#,0" ) & " of the " & FORMAT ( [Responses (card)], "#,0" ) & " responses describe requests that were "
            & [Flags sub] & ". They are counted separately and excluded from the themes above: reading them as dissatisfaction "
            & "would understate the service, and they belong in the data-quality workstream rather than in service feedback. ",
        "" )
    & "Responses are matched to requests on the case number (CS…) the respondent quoted. " & FORMAT ( matched, "#,0" )
    & " of the " & FORMAT ( [All responses], "#,0" ) & " responses match; the rest keep the office they reported and count as "
    & """not matched to a request"", so they drop out once a type, practice or programme offer is chosen."''', None, TX)
