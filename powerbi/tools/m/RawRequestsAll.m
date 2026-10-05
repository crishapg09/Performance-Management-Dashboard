// Every request in the source, typed, before anything is dropped. The survey joins
// against this (a rated request may later have been voided or marked duplicate).
let
    Raw = RawRequestsApi,
    DateCols = Table.SelectRows(FieldMap, each [Kind] = "date")[Column],
    TextCols = Table.SelectRows(FieldMap, each [Kind] <> "date")[Column],
    AsText = Table.TransformColumns(Raw, List.Transform(TextCols, (c) => {c, each if _ = null then "" else Text.From(_), type text})),
    AsDates = Table.TransformColumns(AsText, List.Transform(DateCols, (c) => {c, fnToDateTime, type nullable datetime})),
    WithId = Table.AddColumn(AsDates, "Request ID", each if [Case Report] <> "" then [Case Report] else [Number], type text),
    Real = Table.SelectRows(WithId, each [Request ID] <> "")
in
    Real
