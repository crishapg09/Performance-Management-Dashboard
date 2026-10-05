// A sheet of the survey analysis workbook as a table, finding the header row under
// the sheet's title block (the first row with more than four filled cells).
(book as table, name as text) as table =>
let
    Data = Table.SelectRows(book, each [Kind] = "Sheet" and [Item] = name){0}[Data],
    Rows = Table.ToRows(Data),
    Filled = (row as list) as number => List.Count(List.Select(row, each _ <> null and _ <> "")),
    HeaderAt = List.PositionOf(List.Transform(Rows, each Filled(_) > 4), true),
    RawHeader = List.Transform(Rows{HeaderAt}, each if _ = null then "" else Text.Trim(Text.From(_))),
    Header = List.Transform(List.Positions(RawHeader), each if RawHeader{_} = "" then "Column" & Text.From(_ + 1) else RawHeader{_}),
    Body = List.Select(List.Skip(Rows, HeaderAt + 1), each Filled(_) > 0)
in
    Table.FromRows(Body, Header)
