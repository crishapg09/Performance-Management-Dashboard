// Every field ServiceNow returns for five recent cases, one field per row, so you can
// see which field holds what (e.g. the country office) and fix FieldMap. Not loaded
// into the report; open it in Power Query to look.
let
    Response = Json.Document(Web.Contents(ServiceNowInstance, [
        RelativePath = "api/now/table/" & ServiceNowTable,
        Query = [
            sysparm_query = "ORDERBYDESCsys_updated_on",
            sysparm_display_value = "true",
            sysparm_exclude_reference_link = "true",
            sysparm_limit = "5"
        ],
        Headers = [Accept = "application/json"]
    ])),
    Records = Response[result],
    Fields = List.Sort(List.Distinct(List.Combine(List.Transform(Records, Record.FieldNames)))),
    AsText = (v as any) as nullable text => if v = null then null else try Text.From(v) otherwise "(complex value)",
    Rows = List.Transform(Fields, (f) => {f} & List.Transform(Records, (r) => AsText(Record.FieldOrDefault(r, f, null)))),
    Result = Table.FromRows(Rows, {"Field"} & List.Transform(List.Positions(Records), each "Case " & Text.From(_ + 1)))
in
    Result
