// One row per survey response, linked to the request it rates by case number (CS…).
// Port of app/src/lib/feedback.ts. The responses come from SurveyRaw (workbook only).
let
    Cases = Table.Buffer(Table.SelectColumns(RawRequestsAll, {"Number", "Request ID", "Request Type", "Office/Division", "Global Practice and Cross Sectoral Teams", "Primary Programme Offer"})),
    Linked = Table.AddColumn(SurveyRaw, "c", (r) =>
        let
            Pos = if r[Case number] = "" then -1 else List.PositionOf(Cases[Number], r[Case number], Occurrence.Last),
            Case = if Pos >= 0 then Cases{Pos} else null,
            CaseOffice = if Case <> null then Case[#"Office/Division"] else ""
        in
            [
                Request ID = if Case <> null then Case[Request ID] else null,
                Office raw = if CaseOffice <> "" then CaseOffice else r[Survey office raw],
                Request type = if Case = null then "Unclassified" else (let t = fnMapType(Case[Request Type]) in if t = "" then "Unclassified" else t),
                Practice = if Case = null then null else fnMapPractice(Case[Global Practice and Cross Sectoral Teams]),
                Programme offer = if Case = null then null else fnMapOffer(Case[Primary Programme Offer])
            ]),
    Kept = Table.ExpandRecordColumn(Linked, "c", {"Request ID", "Office raw", "Request type", "Practice", "Programme offer"}),
    WithPlace = fnMapOffices(Kept, "Office raw"),
    // the office as respondents named it keys the map; HQ divisions get their readable name
    SurveyOffice = Table.AddColumn(WithPlace, "Survey office", each
        let p = List.PositionOf(HqOffices[Raw], [Survey office raw]) in if p >= 0 then HqOffices[Office]{p} else [Survey office raw], type text),
    WithCoords = Table.AddColumn(SurveyOffice, "xy", each
        let p = List.PositionOf(OfficeCoords[Office], [Survey office raw]) in if p >= 0 then OfficeCoords{p} else null),
    Lon = Table.AddColumn(WithCoords, "Longitude", each if [xy] = null then null else [xy][Longitude], type nullable number),
    Lat = Table.AddColumn(Lon, "Latitude", each if [xy] = null then null else [xy][Latitude], type nullable number),
    Featured = Table.AddColumn(Lat, "fq", each let p = List.PositionOf(FeaturedQuotes[ID], [Response ID]) in if p >= 0 then FeaturedQuotes{p} else null),
    Quote = Table.AddColumn(Featured, "Featured quote", each if [fq] = null then null else [fq][Quote], type nullable text),
    QuoteTone = Table.AddColumn(Quote, "Featured quote tone", each if [fq] = null then null else [fq][Tone], type nullable text),
    HasPositive = Table.AddColumn(QuoteTone, "Has positive feedback", each if [Positive themes] <> "" then "Yes" else "No", type text),
    Matched = Table.AddColumn(HasPositive, "Matched to request", each if [Request ID] <> null then "Yes" else "No", type text),
    Stars = Table.AddColumn(Matched, "Rating", each if [Satisfaction] = null then "not rated" else Text.Repeat("★", [Satisfaction]) & Text.Repeat("☆", 5 - [Satisfaction]), type text),
    Themes = Table.AddColumn(Stars, "Themes", each Text.Combine(List.Select(
        List.Transform(Text.Split([Positive themes], ";"), Text.Trim) & {[Improvement theme], [Data quality flag]},
        (t) => t <> null and t <> ""), " · "), type text),
    Selected = Table.SelectColumns(Themes, {
        "Response ID", "Survey office", "Case number", "Request ID", "Matched to request", "Request type", "Region", "Office",
        "Practice", "Programme offer", "Comment", "Written", "Substantive", "Has positive feedback", "Positive themes",
        "Improvement theme", "Data quality flag", "Themes", "Rating", "Satisfaction", "Quality", "Timeliness", "Contribution", "Recommend",
        "Longitude", "Latitude", "Featured quote", "Featured quote tone"}),
    Keys = Table.TransformColumns(Selected, List.Transform({"Office", "Practice", "Programme offer"},
        (c) => {c, each if _ = "" then null else _, type nullable text})),
    Typed = Table.TransformColumnTypes(Keys, {
        {"Response ID", type text}, {"Case number", type text}, {"Request ID", type text}, {"Request type", type text},
        {"Region", type text}, {"Comment", type text}, {"Written", type text}, {"Substantive", type text},
        {"Positive themes", type text}, {"Improvement theme", type text}, {"Data quality flag", type text},
        {"Satisfaction", Int64.Type}, {"Quality", Int64.Type}, {"Timeliness", Int64.Type}, {"Contribution", Int64.Type},
        {"Recommend", type number}})
in
    Typed
