// The as-of date every figure is measured from, and when the data was refreshed.
#table(type table [#"As of" = date, Refreshed = datetime], {{Date.From(AsOf), DateTime.LocalNow()}})
