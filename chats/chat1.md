# TA Performance Management Dashboard

_Started 2026-06-30 21:22 UTC_

---

## User

You will create a TA Performance Management dashboard using the attached data, I need to know the following data: number of TA + implementation status
TA lead staff by status
implementations status vs expected completion date
completeness of TA requests (data quality)

average time between opening and closing requests
average time between opening and 25% (update time)

FLOW: metrics on filters by type of request, by region, 
1. assignment or unassigned
2. number of days before the TA is created and is assigned
3. by practice and staff member 
4. in contact rating - how many are at 25% and how long does it take 
5. activity ongoing during implementation?
6. completion/closure by target date?
7. if we have a target date, is it completed on time or on track to be completed in time 
8. percentage and number of requests that have been finalized (100%) on time or pending to be finalized by 2Q
9. how active are the practices

## Assistant

I'll start by reading the attached data file to understand its structure.

_[tool: run_script]_

_[tool: list_files]_

_[tool: copy_files]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: read_file]_

_[tool: read_file]_

This is UNICEF Technical Assistance (TA) case data. Let me parse all rows into a clean dataset.

_[tool: run_script]_

4160 rows. Now let me compute the key aggregates to understand distributions and the metrics requested.

_[tool: run_script]_

_[tool: run_script]_

I've parsed the full dataset (4,160 TA cases, Jan–Jun 2026). Before building I want to lock a few things — the data needs are clear, but the look and a couple of scope points aren't.

Key data realities I found that shape the dashboard:
- Statuses are completion %: 0/25/50/75/100, plus Discontinued and Unassigned.
- There's no explicit "assigned date" or "date reached 25%" — only Created/Opened (identical), a single Updated timestamp, Resolved, Closed. So "time to assignment" and "time to 25%" can't be computed exactly; I'd use Updated as an "activity/update time" proxy and flag it.
- 474 cases at 100%; many lack a close date. ~349 active cases are past their target date.

_[tool: questions_v2]_

## User

Questions answered:
- format: A single interactive dashboard (filters + charts on one scrolling page)
- audience: Both — exec summary up top, detail below
- interactivity: Fully interactive — live filters by region/type/practice/status recompute everything
- filters: Request Type (Big Ticket / Routine), Region, Practice / Sector, Assigned staff member, Implementation Status
- proxies: Show what IS available (update time, open→close) and clearly label proxies
- aesthetic: Clean institutional / UNICEF-like (cool blues, neutral, data-first)
- priority: 1. implementation status in numbers and completion based on expected completion date - which TAs should be closed by now given completion date but are not. Filter by region and practice area
2. time it takes on average from opening to update and then to closing 
3. Inconsistency in TAs, for example those that show an advance implementation status but have not been assigned a TA lead staff

## Assistant

Got it. Building a single interactive dashboard, UNICEF-institutional, with your three priorities leading. First, a slim embeddable data module.

_[tool: run_script]_

Now I'll build the dashboard as a Design Component. Laying out the structure: sticky filter bar → exec KPI strip → ① implementation status & overdue → ② timeliness → ③ inconsistencies → workload.

_[tool: dc_write]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

Header, filters, and KPI strip render correctly. Let me see the lower sections.

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

All four sections render correctly with live data. The dashboard is complete. Handing off for verification.

_[tool: ready_for_verification]_

Done. Built a single interactive **TA Performance Dashboard** from your 4,160 records, UNICEF-institutional styling, with your three priorities leading:

- **① Status & completion vs. target** — status breakdown, on-track vs. overdue split, and a red "should be closed by now" callout (349 active requests past their target date) with by-region and by-practice breakdowns plus a most-overdue table. Filter by region and practice recomputes all of it.
- **② Cycle time** — avg/median open→update (activity proxy) and open→close, % finalized on time.
- **③ Inconsistencies** — e.g. 31 cases at ≥25% with no TA lead (listed in a table), 220 marked 100% with no close date, plus field-completeness bars.

Live filters across the top: request type, region, practice, TA lead, and status — everything recomputes instantly.

Two honest data caveats baked into the dashboard: there's **no assignment date or "reached 25%" date** in the export (Opened == Created on every row), so true time-to-assignment and time-to-25% can't be measured — I labeled the update-time proxy and flagged this inline. If those events can be captured at source, I can add real metrics for them.

## User

this is a great start. lets do some edits, the first is the region filter I want it to be single select, so when I select one region, any other preselected region will be automatically deselected

## Assistant

_[tool: dc_js_str_replace]_

Done — region is now single-select. Clicking a region selects only that one (deselecting any other); clicking the active region clears back to all regions.

## User

filter out all TA requests with region in blank or HQ

## Assistant

_[tool: dc_js_str_replace]_

Done — all requests with a blank region or region = HQ are now excluded everywhere (KPIs, charts, tables, and the region filter list). The source count in the header also reflects the filtered universe.

## User

also remove TAs that are discontinued in the implementation status column

## Assistant

_[tool: dc_js_str_replace]_

Now let me remove the now-empty "Discontinued" entry from the status legend and filter chips.

_[tool: dc_js_str_replace]_

Done — Discontinued requests are removed from the dataset entirely, and I dropped the now-empty "Discontinued" item from the status legend and filter chips.

## User

move the region filter as a drop down menu between request type and practice/sector

## Assistant

_[tool: dc_html_str_replace]_

Now remove the region chips block below:

_[tool: dc_html_str_replace]_

Now wire up the region select in the logic — replace `regionChips` with `region` value, `regionOpts`, and `onRegion`:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Done. Region is now a dropdown sitting between Request type and Practice/sector, and the status chips are on the row below. It stays single-select — pick a region or "All regions" to clear.

## User

below the filters and gray line, add a dynamic title that describes what filters have been implemented

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: save_screenshot]_

The dynamic title line isn't appearing. Let me check logs.

_[tool: get_webview_logs]_

_[tool: show_html]_

_[tool: save_screenshot]_

The dynamic title now shows: **"All TA requests — every region, practice & status"** below the filters. It updates as you filter — e.g. selecting Big Ticket + ESAR + Health reads "Big Ticket requests · ESAR · Health". The earlier blank was just a stale first-paint state.

