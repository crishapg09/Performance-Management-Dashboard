// One row per theme a response was coded to: every positive theme (a comment can
// carry several), its one improvement theme, and any data-quality flag.
let
    Source = Table.SelectColumns(Survey, {"Response ID", "Positive themes", "Improvement theme", "Data quality flag"}),
    Rows = List.Combine(List.Transform(Table.ToRecords(Source), (r) =>
        List.Transform(List.Select(List.Transform(Text.Split(r[Positive themes], ";"), Text.Trim), each _ <> ""),
            (t) => {r[Response ID], "Positive", t})
        & (if r[Improvement theme] <> null then {{r[Response ID], "Improvement", r[Improvement theme]}} else {})
        & (if r[Data quality flag] <> null then {{r[Response ID], "Data-quality flag", r[Data quality flag]}} else {}))),
    Result = Table.FromRows(Rows, type table [Response ID = text, Kind = text, Theme = text]),
    // "Other improvement" sorts last: it is the least actionable row
    Ordered = Table.AddColumn(Result, "Theme is other", each if Text.StartsWith(Text.Lower([Theme]), "other") then 1 else 0, Int64.Type)
in
    Ordered
