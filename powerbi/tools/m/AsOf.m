// The "as of" date: the day of the latest Created / Opened / Updated timestamp among
// the requests kept (same rule as scripts/extract.py). Every "days late", "last 30
// days" and "overdue" figure is measured from this date, not from the refresh time.
let
    Kept = Table.SelectRows(RawRequestsAll, each not List.Contains(ExcludedResolutions, [Resolution code])),
    Stamps = List.RemoveNulls(Kept[Created] & Kept[Opened] & Kept[Updated]),
    Day = DateTime.From(Date.From(List.Max(Stamps)))
in
    Day
