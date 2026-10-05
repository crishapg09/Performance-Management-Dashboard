# REACH TA Dashboard — Power BI

A Power BI version of the web dashboard: the same three pages (Performance,
Data Quality Review, Feedback), the same definitions and the same clean-up
rules. It reads two sources:

1. **ServiceNow**, through the Table API: the TA requests.
2. **The survey analysis workbook** (`REACH_TA_Survey_Analysis_FINAL.xlsx`):
   the feedback.

```
powerbi/
  REACH_TA_Dashboard.pbip              ← open this in Power BI Desktop
  REACH_TA_Dashboard.SemanticModel/    the data model: Power Query, tables, relationships, measures
  REACH_TA_Dashboard.Report/           the three report pages
  tools/                               the generator scripts and checks (see "Changing things")
```

## 1. Open it

1. Update Power BI Desktop to the latest version.
2. Double-click `REACH_TA_Dashboard.pbip`. If Desktop says it cannot open the
   file, go to **File → Options and settings → Options → Preview features**,
   tick **Power BI Project (.pbip) save option** and **Store reports using
   enhanced metadata format (PBIR)**, restart Desktop and open it again.
3. Desktop will say the model has no data yet. That is expected: set the
   parameters (section 2) and map the API fields (section 3), then **Refresh**.

## 2. Set the parameters

**Home → Transform data → Edit parameters**:

| Parameter | Source | What to put |
|---|---|---|
| `ServiceNowInstance` | ServiceNow | your instance URL, e.g. `https://unicef.service-now.com` |
| `ServiceNowTable` | ServiceNow | `sn_customerservice_case` (change only if your API uses another table) |
| `ServiceNowQuery` | ServiceNow | optional: the filter of your "Case Report" as an encoded query (in ServiceNow, right-click the report's filter breadcrumb → **Copy query**). Blank = every case |
| `SurveyWorkbookPath` | Survey | path or SharePoint/OneDrive URL of `REACH_TA_Survey_Analysis_FINAL.xlsx` |

## 3. Connect the ServiceNow API

The model calls the standard ServiceNow Table API
(`/api/now/table/<table>`), 5,000 records per call, until it has every case.

**The field mapping.** The `FieldMap` query (**Transform data → Source →
FieldMap**) lists each request field the model uses and the API field that
supplies it. It is filled in from the fields of UNICEF's
`sn_customerservice_case` API. The model asks the API for these fields itself,
so you only need the instance and table, not the full URL with
`sysparm_fields`.

Three of the mappings are best guesses. After the first refresh, open
`RawRequestsApi`, find a case you know, and compare it with ServiceNow:

| Column | Mapped to | Should show | If not, try |
|---|---|---|---|
| `Case Report` | `parent` | the request number (CSR…) | the request's own number field; if blank, the case number (CS…) is used |
| `Office/Division` | `u_business_area` (confirmed) | the country office, e.g. "Kenya" | — |
| `Primary Programme Offer` | `u_category` | e.g. "Policy Reform and Programme Design" | `u_sub_category` |

Also check that `Implementation Status` reads `0%`, `25%` … `100%`,
`Unassigned` or `Discontinued`, and `Request Type` reads `Big Ticket Item` or
`Regular`. The pages rely on those values.

**Finding the office field.** The `FieldFinder` query (**Source → FieldFinder**)
reads 200 recent cases and ranks every API field by how many of its values are
known country offices. The field at the top goes on the Office/Division row of
`FieldMap`.

**Which field holds what?** The `ApiSample` query (**Source → ApiSample**)
lists every field ServiceNow returns for five recent cases, one field per row.
Use it to find the right field for any mapping. In `FieldMap`, a mapping can
list fallbacks: `a|b` uses the first one with a value.
If the office is blank, every request falls into region "Unmapped", and the
Performance and Data Quality pages come out empty. To change a mapping, edit the
`ApiField` text in `FieldMap` (or in `tools/m/FieldMap.m`, then rerun
`build_model.py`).

> If your API is a custom one (a Scripted REST API that already returns the
> report's columns), the `RawRequestsApi` query needs adapting to its URL and
> record shape. That is usually simpler: the field mapping may not be needed.

**Credentials.** On the first refresh Desktop asks how to sign in to the
instance. Choose **Basic** (a ServiceNow integration account) or whatever your
API uses. Credentials are stored by Power BI, never in these files.

## 4. Publish and schedule

The project files hold no data, so **refresh in Desktop before every publish**:
publishing an empty model gives a blank report.

1. In Desktop, set `SurveyWorkbookPath` to the survey workbook's **web
   address**. A `C:\…` path, even inside a synced OneDrive folder, works in
   Desktop but the Power BI service cannot reach it. Open the workbook in
   Excel desktop, choose **File → Info → Copy path**, and remove anything
   from `?` onwards. It looks like
   `https://unicef-my.sharepoint.com/personal/…/REACH_TA_Survey_Analysis_FINAL.xlsx`.
   Sign in with **Organizational account** when asked.
2. **Home → Refresh**, check the pages, then **Home → Publish** to your workspace.
3. In the workspace, open the **semantic model** (same name as the report)
   **→ ⋯ → Settings**:
   - **Data source credentials**: ServiceNow → **Basic**, with the integration
     account; the survey workbook → **OAuth2**, with your UNICEF account. Set
     both privacy levels to **Organizational**.
   - **Gateway**: usually none is needed (ServiceNow cloud + SharePoint Online).
     If the settings say one is required, ask IT.
   - **Scheduled refresh**: e.g. daily at 06:00.
   - Click **Refresh now**. If it fails, **Refresh history** shows the error.
4. Share it as an **app** or through workspace access. Access follows UNICEF
   sign-in.

## 5. Check the numbers

Once the field mapping is done and the model has refreshed, compare the pages
with the web dashboard. With no slicers set and the 2 Oct 2026 data, the web
dashboard shows:

| Page | Figure | Value |
|---|---|---|
| Performance | Total requests | 4,941 |
| | Big ticket · routine | 1,058 · 3,883 |
| | Received last 30 days | 389 |
| | Active & on track | 2,626 |
| | Completed | 1,548 |
| | Overdue (1–30 / 31–60 / >60 days) | 738 (437 / 32 / 269) |
| | TA leads · fewest / average / most | 400 · 1 / 12.2 / 75 |
| Data Quality | Awaiting assignment · In review (0%) | 29 · 459 |
| | Stalled in setup | 194 |
| | In delivery (25%+) · Needing cleanup | 2,905 · 580 |
| | Completeness (lead / date / description / modality / offer) | 99 / 96 / 96 / 93 / 99 % |
| | Record quality score | 87% |
| | Placeholder descriptions · Possible duplicates | 163 · 91 |
| | Due in next 30 days · Not closed | 89 · 161 |
| | Phase: in review / in delivery / overdue | 488 / 3,788 / 665 |
| Feedback | Responses · written · substantive | 213 · 141 · 133 |
| | Improvement opportunities · data-quality flags | 50 · 7 |
| | Satisfaction / quality / timeliness | 4.38 / 4.06 / 4.20 |
| | Would recommend | 8.0 |
| | Routine / Big Ticket / not matched | 177 / 35 / 1 |
| | Pieces of positive feedback | 219 |

Power BI shows the data as of its own refresh, so expect some movement from
requests updated since 2 Oct. Compare against the web dashboard on the same
day instead. A gap that persists usually points to one field in `FieldMap`
mapped to the wrong API field. Dates can also differ: the API returns UTC, the
web dashboard's export uses your ServiceNow time zone, so a figure can move by
one at the edges of a day.

`tools/reconcile.py` is a line-by-line Python copy of the model's logic. Run on
the export and survey workbook the web dashboard uses, it gives the same 45
figures as the web dashboard:
`python powerbi/tools/reconcile.py <export.xlsx> <survey.xlsx>`.

## What is where

**Pages.** The slicers (request type, practice, region, country office,
programme offer, plus status and quarter on the first two pages) are synced
across pages, as the web filter bar is shared across tabs. Each slicer only
lists values that have data under the other slicers. Clicking a bar, segment or
map bubble filters the tables below it: this replaces the web dashboard's
"click to read these comments" and drill-down tables.

**Scope.** The Performance page counts country office requests that are not
discontinued. The Data Quality page counts all country office requests. Both
are set as page filters on `Requests[In performance scope]` and
`Requests[Country office request]`.

**The model.**

| Table | One row per |
|---|---|
| `Requests` | TA request, with every flag the measures use (overdue, on track, phase, stalled, passes checks…), each column described in the model |
| `Survey` | survey response, linked to its request by case number (CS…) |
| `SurveyThemes` | theme a response was coded to (positive, improvement, data-quality flag) |
| `Request types`, `Practices`, `Offices`, `Programme offers` | the values each slicer lists, shared by requests and survey so one slicer filters both. Calculated inside Power BI from the two tables above |
| `Months`, `Data date` | the month axis and the as-of date, also calculated inside Power BI |
| `Portfolio metric`, `Completeness check` | fixed lists that drive two charts |

A refresh reads ServiceNow twice: once for `Requests`, and once for `Survey` to
link each response to the request it rates. Everything else is built from those.

Every figure is measured from the **as-of date**: the day of the latest
Created/Opened/Updated timestamp in the data, as on the web dashboard.

**Survey rules carried over**: theme coding for the 28 later responses, the
six corrected satisfaction answers, the removed Kenya response (56), the map
coordinates, and the six featured quotes. They are generated from the files in
`scripts/` (see below).

**Known differences from the web version**
- Stars are shown as text (★★★★☆), rounded to the nearest whole star.
- The world map is a scatter chart on a map picture, positioned by
  longitude/latitude. If the bubbles look offset, adjust the map visual's size
  until the coastline sits right (the picture stretches to the plot area).
- "Other improvement" is not forced to the bottom of the improvement chart.
- Possible duplicates are found across all country office requests, not within
  the current filter. A slicer can therefore show a duplicate whose earlier
  twin is filtered out.

## Changing things

The model and pages are generated, so changes are reproducible:

```
python powerbi/tools/build_model.py    # Power Query (tools/m/*.m), tables, measures (tools/measures.py)
python powerbi/tools/build_report.py   # page layouts
```

Small changes, such as moving a visual or changing a colour, are fine to make
directly in Power BI Desktop and save. If you then regenerate, the generated
files overwrite them, so after editing in Desktop, keep using Desktop.

The survey fixes (`scripts/survey_manual_coding.json`,
`scripts/survey_corrections.json`) and the region list
(`app/src/data/regionSource.json`) are shared with the web dashboard. After
changing one, run `build_model.py` so Power BI picks it up.
