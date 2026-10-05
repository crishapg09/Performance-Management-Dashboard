// Matching key -> canonical office and region, from the "Regions & Countries 2026"
// reference plus aliases (see RegionReference). Later rows win, as in regionMap.ts.
let
    Source = RegionReference,
    Keyed = Table.AddColumn(Source, "Key", each fnNormOffice([Name]), type text),
    Indexed = Table.AddIndexColumn(Keyed, "Order", 0, 1, Int64.Type),
    LastWins = Table.Distinct(Table.Sort(Indexed, {{"Order", Order.Descending}}), {"Key"}),
    Result = Table.SelectColumns(LastWins, {"Key", "Office", "Region"})
in
    Result
