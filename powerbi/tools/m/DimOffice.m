// Country offices and their region, from the requests and the survey. Drives both
// the Region and the Country office slicers, so picking a region narrows the
// country list.
let
    Pairs = Table.Combine({
        Table.SelectColumns(Requests, {"Office", "Region"}),
        Table.SelectColumns(Survey, {"Office", "Region"})}),
    Real = Table.SelectRows(Pairs, each [Office] <> null),
    Distinct = Table.Distinct(Real, {"Office"})
in
    Table.Sort(Distinct, {{"Region", Order.Ascending}, {"Office", Order.Ascending}})
