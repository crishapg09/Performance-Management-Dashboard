// Months for the "opened vs completed" chart: April 2026 (when the REACH import
// landed) to the month of the as-of date.
let
    Last = Date.StartOfMonth(Date.From(AsOf)),
    Count = List.Max({1, (Date.Year(Last) - 2026) * 12 + Date.Month(Last) - 3}),
    Months = List.Transform(List.Numbers(0, Count), each Date.AddMonths(#date(2026, 4, 1), _)),
    T = Table.FromList(Months, Splitter.SplitByNothing(), type table [Month = date]),
    Label = Table.AddColumn(T, "Month label", each Date.ToText([Month], [Format = "MMM yyyy", Culture = "en-GB"]), type text),
    Order = Table.AddColumn(Label, "Month order", each Date.Year([Month]) * 100 + Date.Month([Month]), Int64.Type)
in
    Order
