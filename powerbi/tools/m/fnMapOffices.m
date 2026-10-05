// Adds canonical [Office] and [Region] to a table from its raw office column.
// Port of mapOffice(): known offices get the reference name and region; a few
// HQ divisions get a readable name and region "HQ"; anything else keeps its
// own name and falls into region "Unmapped".
(t as table, rawColumn as text) as table =>
let
    Distinct = List.Distinct(List.Transform(Table.Column(t, rawColumn), each if _ = null then "" else Text.Trim(Text.From(_)))),
    Mapped = Table.FromRecords(List.Transform(Distinct, (raw) =>
        let
            Hq = List.PositionOf(HqOffices[Raw], raw),
            Key = fnNormOffice(raw),
            Hit = List.PositionOf(OfficeLookup[Key], Key)
        in
            if Hq >= 0 then [Raw = raw, Office = HqOffices[Office]{Hq}, Region = "HQ"]
            else if Hit >= 0 then [Raw = raw, Office = OfficeLookup[Office]{Hit}, Region = OfficeLookup[Region]{Hit}]
            else [Raw = raw, Office = raw, Region = "Unmapped"]
    ), type table [Raw = text, Office = text, Region = text]),
    WithKey = Table.AddColumn(t, "__raw", each let v = Record.Field(_, rawColumn) in if v = null then "" else Text.Trim(Text.From(v)), type text),
    Joined = Table.NestedJoin(WithKey, {"__raw"}, Mapped, {"Raw"}, "__map", JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined, "__map", {"Office", "Region"}, {"Office", "Region"})
in
    Table.RemoveColumns(Expanded, {"__raw"})
