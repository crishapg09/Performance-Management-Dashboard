// Which API field holds what? Reads 200 recent cases and, for every field ServiceNow
// returns, shows how many values are known country offices, plus a few example values.
// The field at the top is the one to put on the Office/Division row of FieldMap.
// Not loaded into the report; open it in Power Query to look.
let
    Response = Json.Document(Web.Contents(ServiceNowInstance, [
        RelativePath = "api/now/table/" & ServiceNowTable,
        Query = [
            sysparm_query = "ORDERBYDESCsys_updated_on",
            sysparm_display_value = "true",
            sysparm_exclude_reference_link = "true",
            sysparm_limit = "200"
        ],
        Headers = [Accept = "application/json"]
    ])),
    Records = Response[result],
    Fields = List.Sort(List.Distinct(List.Combine(List.Transform(Records, Record.FieldNames)))),
    Keys = List.Buffer(OfficeLookup[Key]),
    AsText = (v as any) as text => if v = null then "" else try Text.From(v) otherwise "",
    Rows = List.Transform(Fields, (f) =>
        let
            Values = List.Select(List.Transform(Records, (r) => AsText(Record.FieldOrDefault(r, f, null))), each _ <> ""),
            Distinct = List.Distinct(Values),
            Offices = List.Select(Distinct, (v) => Text.Length(v) < 80 and List.Contains(Keys, fnNormOffice(v))),
            Matches = List.Count(List.Select(Values, (v) => List.Contains(Offices, v)))
        in
            {f, Matches, List.Count(Values), Text.Combine(List.FirstN(Distinct, 5), "  |  ")}),
    Result = Table.FromRows(Rows, type table [Field = text, #"Cases with a known office" = Int64.Type, #"Cases with a value" = Int64.Type, #"Example values" = text]),
    Sorted = Table.Sort(Result, {{"Cases with a known office", Order.Descending}, {"Cases with a value", Order.Descending}})
in
    Sorted
