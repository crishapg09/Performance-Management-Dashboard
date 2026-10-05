// One row per TA request: the source cleaned and normalised exactly as the web
// dashboard does it (scripts/extract.py + app/src/data/cases.ts + lib/dashboard.ts),
// with every per-request flag the measures need computed once here.
let
    Today = Number.From(AsOf),
    Round = (x as nullable number) as nullable number => if x = null then null else Number.RoundDown(x + 0.5),
    Num = (d as nullable datetime) as nullable number => if d = null then null else Number.From(d),
    YN = (b as logical) as text => if b then "Yes" else "No",
    Fmt = (d as nullable datetime) as text => if d = null then "—" else DateTime.ToText(d, [Format = "dd MMM yyyy", Culture = "en-GB"]),
    MonthOf = (d as nullable datetime) as nullable date => if d <> null and Date.Year(d) = 2026 then #date(2026, Date.Month(d), 1) else null,
    RealRegions = {"ESAR", "APR", "WCAR", "LACR", "ECAR", "MENAR"},

    Kept = Table.SelectRows(RawRequestsAll, each not List.Contains(ExcludedResolutions, [Resolution code])),
    // the export's own Region is unreliable; the office decides the region (fnMapOffices)
    KeptRenamed = Table.RenameColumns(Kept, {{"Region", "Region as recorded"}}),
    WithPlace = fnMapOffices(KeptRenamed, "Office/Division"),
    Indexed = Table.AddIndexColumn(WithPlace, "Source order", 0, 1, Int64.Type),

    Calc = Table.AddColumn(Indexed, "c", (r) =>
        let
            Status = r[Implementation Status],
            Lead = r[Assigned to],
            Xs = Num(r[Expected Start Date]),
            Xc = Num(r[Expected Completion Date]),
            Received = if r[Created] <> null then r[Created] else r[Opened],
            Details = fnCleanHtml(r[#"Details/Description"]),
            Placeholder = fnIsPlaceholder(Details),
            HasDesc = not Placeholder,
            IsCO = List.Contains(RealRegions, r[Region]),
            Closedish = List.Contains({"100%", "Discontinued"}, Status),
            PastTarget = Xc <> null and Xc < Today,
            Overdue = not Closedish and PastTarget,
            DaysLate = if Xc = null then null else Today - Xc,
            Active = not List.Contains({"100%", "Discontinued", "Unassigned"}, Status),
            InReview = List.Contains({"Unassigned", "0%"}, Status),
            WaitFrom = if Status = "Unassigned" then Received else (if r[Updated] <> null then r[Updated] else Received),
            Waiting = if WaitFrom = null then null else Round(Today - Num(WaitFrom)),
            Stalled = InReview and Waiting <> null and (if Status = "Unassigned" then Waiting > 14 else Waiting > 30),
            Delivery = List.Contains({"25%", "50%", "75%", "100%"}, Status),
            BeforeStart = Xc <> null and Xs <> null and Xc < Xs,
            Issue =
                if Lead = "" then "no TA lead"
                else if Xc = null then "no target date"
                else if not HasDesc then "no details/description"
                else if r[Modality] = "" then "no modality"
                else if r[Primary Programme Offer] = "" then "no offer"
                else if BeforeStart then "target before start"
                else null,
            Phase =
                if Status = "Discontinued" then null
                else if InReview then "In review"
                else if Status <> "100%" and PastTarget then "Overdue"
                else "Started & in delivery",
            Done = if r[Closed] <> null then r[Closed] else r[Resolved]
        in
            [
                Request type = fnMapType(r[Request Type]),
                Practice = fnMapPractice(r[Global Practice and Cross Sectoral Teams]),
                Programme offer = fnMapOffer(r[Primary Programme Offer]),
                Details = if Details <> "" then Details else r[Short description],
                Has description = YN(HasDesc),
                Placeholder description = YN(Placeholder),
                Has objectives = YN(r[Objectives] <> ""),
                Status order = List.PositionOf({"0%", "25%", "50%", "75%", "100%", "Unassigned", "Discontinued"}, Status) + 1,
                Expected completion quarter = if Xc = null then null else Text.From(Date.Year(r[Expected Completion Date])) & " Q" & Text.From(Date.QuarterOfYear(r[Expected Completion Date])),
                Country office request = YN(IsCO),
                In performance scope = YN(IsCO and Status <> "Discontinued"),
                Is overdue = YN(Overdue),
                Days past target = if Overdue then Round(DaysLate) else null,
                Overdue bucket = if not Overdue then null else if DaysLate <= 30 then "1–30 days" else if DaysLate <= 60 then "31–60 days" else ">60 days",
                Overdue bucket order = if not Overdue then null else if DaysLate <= 30 then 1 else if DaysLate <= 60 then 2 else 3,
                Is active = YN(Active),
                On track = YN(Active and not PastTarget),
                Received last 30 days = YN(Received <> null and Num(Received) >= Today - 30 and Num(Received) <= Today),
                Days since received = if Received = null then null else Round(Today - Num(Received)),
                Opened month = MonthOf(r[Opened]),
                Completed month = if Status = "100%" then MonthOf(Done) else null,
                In review = YN(InReview),
                Days waiting = if InReview then Waiting else null,
                Stalled = YN(Stalled),
                Time in setup = if not InReview or Waiting = null then null else if Waiting <= 14 then "0–14 days" else if Waiting <= 30 then "15–30 days" else "30+ days",
                Time in setup order = if not InReview or Waiting = null then null else if Waiting <= 14 then 1 else if Waiting <= 30 then 2 else 3,
                Ready to advance = YN(Status = "0%" and HasDesc and Lead <> "" and Xc <> null),
                Assigned without lead = YN(Status = "0%" and Lead = ""),
                In delivery stage = YN(Delivery),
                Passes all checks = YN(Delivery and Issue = null),
                Data issue = if Delivery then Issue else null,
                Target before start = YN(BeforeStart),
                Due in next 30 days = YN(not Closedish and Xc <> null and Xc >= Today and Xc <= Today + 30),
                Not closed = YN(Closedish and r[Closed] = null),
                Not closed reason = if Closedish and r[Closed] = null then (if Status = "100%" then "completed" else "discontinued") else null,
                Phase = Phase,
                Phase order = if Phase = "In review" then 1 else if Phase = "Started & in delivery" then 2 else if Phase = "Overdue" then 3 else null,
                Phase detail =
                    if Phase = "In review" then (if Waiting = null then "—" else Text.From(Waiting) & "d")
                    else if Phase = "Overdue" then "+" & Text.From(Round(DaysLate)) & "d"
                    else if Phase = null then null
                    else Fmt(r[Expected Completion Date]),
                Urgency = if InReview then Waiting else if Xc = null then -1000000 else Today - Xc
            ]
    ),
    Expanded = Table.ExpandRecordColumn(Calc, "c", {
        "Request type", "Practice", "Programme offer", "Details", "Has description", "Placeholder description",
        "Has objectives", "Status order", "Expected completion quarter", "Country office request", "In performance scope",
        "Is overdue", "Days past target", "Overdue bucket", "Overdue bucket order", "Is active", "On track",
        "Received last 30 days", "Days since received", "Opened month", "Completed month", "In review", "Days waiting",
        "Stalled", "Time in setup", "Time in setup order", "Ready to advance", "Assigned without lead", "In delivery stage",
        "Passes all checks", "Data issue", "Target before start", "Due in next 30 days", "Not closed", "Not closed reason",
        "Phase", "Phase order", "Phase detail", "Urgency"}, null),

    // Possible duplicates: among country office requests, a later request with the same
    // "Requested For" and short description as an earlier one (dashboard.ts dupCount).
    DupKeyed = Table.AddColumn(Expanded, "__dup", each
        if [Country office request] = "Yes" and [Requested For] <> "" and [Short description] <> ""
        then Text.Lower([Requested For] & "|" & [Short description]) else null, type nullable text),
    FirstSeen = Table.Group(Table.SelectRows(DupKeyed, each [__dup] <> null), {"__dup"}, {{"__first", each List.Min([Source order]), Int64.Type}}),
    DupJoined = Table.NestedJoin(DupKeyed, {"__dup"}, FirstSeen, {"__dup"}, "__f", JoinKind.LeftOuter),
    DupFlag = Table.AddColumn(Table.ExpandTableColumn(DupJoined, "__f", {"__first"}), "Possible duplicate",
        each if [__dup] <> null and [__first] <> null and [Source order] > [__first] then "Yes" else "No", type text),

    Renamed = Table.RenameColumns(DupFlag, {
        {"Number", "Case number"}, {"Implementation Status", "Status"}, {"Assigned to", "TA lead"},
        {"Requested For", "Requested for"}, {"Office/Division", "Office as recorded"},
        {"Primary Programme Offer", "Offer as recorded"},
        {"Expected Start Date", "Expected start"}, {"Expected Completion Date", "Expected completion"}}),
    Selected = Table.SelectColumns(Renamed, {
        "Request ID", "Case number", "Request type", "Region", "Office", "Office as recorded", "Region as recorded", "Practice",
        "Programme offer", "Offer as recorded", "Modality", "Language", "Status", "Status order", "TA lead",
        "Requested for", "Requested by", "Short description", "Details", "Collaborators",
        "Expected start", "Expected completion", "Created", "Opened", "Updated", "Resolved", "Closed",
        "Resolution code", "State", "Expected completion quarter", "Has description", "Placeholder description",
        "Has objectives", "Country office request", "In performance scope", "Is overdue", "Days past target",
        "Overdue bucket", "Overdue bucket order", "Is active", "On track", "Received last 30 days",
        "Days since received", "Opened month", "Completed month", "In review", "Days waiting", "Stalled",
        "Time in setup", "Time in setup order", "Ready to advance", "Assigned without lead", "In delivery stage",
        "Passes all checks", "Data issue", "Target before start", "Due in next 30 days", "Not closed",
        "Not closed reason", "Phase", "Phase order", "Phase detail", "Urgency", "Possible duplicate", "Source order"}),
    // blanks become nulls on the columns that link to the slicer tables
    Keys = Table.TransformColumns(Selected, List.Transform({"Request type", "Office", "Practice", "Programme offer", "TA lead"},
        (c) => {c, each if _ = "" then null else _, type nullable text})),
    Typed = Table.TransformColumnTypes(Keys, {
        {"Status order", Int64.Type}, {"Days past target", Int64.Type}, {"Overdue bucket order", Int64.Type},
        {"Days since received", Int64.Type}, {"Opened month", type date}, {"Completed month", type date},
        {"Days waiting", Int64.Type}, {"Time in setup order", Int64.Type}, {"Phase order", Int64.Type},
        {"Urgency", type number}, {"Source order", Int64.Type}})
in
    Typed
