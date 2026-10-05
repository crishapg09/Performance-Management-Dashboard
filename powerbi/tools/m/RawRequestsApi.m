// Every case from the ServiceNow Table API, 5,000 per page, in creation order.
// sysparm_display_value=all returns each field as [display_value, value]: text and
// reference fields use the display value (names, not sys_ids); dates use the stored
// value. Credentials are entered once in Power BI (Data source settings), not here.
let
    PageSize = 5000,
    Mapped = Table.SelectRows(FieldMap, each not Text.StartsWith([ApiField], "TODO_")),
    Fields = Text.Combine(List.Distinct(List.Combine(List.Transform(Mapped[ApiField], (f) => List.Transform(Text.Split(f, "|"), Text.Trim)))), ","),
    Query = (if ServiceNowQuery = "" then "" else ServiceNowQuery & "^") & "ORDERBYsys_created_on",
    GetPage = (offset as number) as list =>
        let
            Response = Json.Document(Web.Contents(ServiceNowInstance, [
                RelativePath = "api/now/table/" & ServiceNowTable,
                Query = [
                    sysparm_query = Query,
                    sysparm_fields = Fields,
                    sysparm_display_value = "all",
                    sysparm_exclude_reference_link = "true",
                    sysparm_limit = Text.From(PageSize),
                    sysparm_offset = Text.From(offset)
                ],
                Headers = [Accept = "application/json"]
            ]))
        in
            Response[result],
    Pages = List.Generate(
        () => [Offset = 0, Rows = GetPage(0)],
        each List.Count([Rows]) > 0,
        each [Offset = [Offset] + PageSize, Rows = if List.Count([Rows]) < PageSize then {} else GetPage([Offset] + PageSize)],
        each [Rows]
    ),
    Records = List.Combine(Pages),
    // one field, or several separated by "|": the first one with a value wins
    PickOne = (rec as record, field as text, kind as text) as any =>
        let
            V = if Text.StartsWith(field, "TODO_") then null else Record.FieldOrDefault(rec, field, null),
            Part = if V is record then (if kind = "date" then Record.FieldOrDefault(V, "value", null) else Record.FieldOrDefault(V, "display_value", null)) else V
        in
            if Part = "" then null else Part,
    Pick = (rec as record, field as text, kind as text) as any =>
        List.First(List.RemoveNulls(List.Transform(Text.Split(field, "|"), (f) => PickOne(rec, Text.Trim(f), kind))), null),
    FieldRecs = List.Buffer(Table.ToRecords(FieldMap)),
    Rows = List.Transform(Records, (rec) => List.Transform(FieldRecs, (m) => Pick(rec, m[ApiField], m[Kind]))),
    Result = Table.FromRows(Rows, FieldMap[Column])
in
    Result
