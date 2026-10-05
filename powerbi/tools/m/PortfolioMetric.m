// The four "Where the work stands" metrics; pick one to re-break the practice chart.
#table(type table [Metric = text, #"Metric order" = Int64.Type, Description = text],
    {
        {"Received last 30 days", 1, "opened in the last 30 days"},
        {"Active & on track", 2, "in progress, not overdue"},
        {"Completed", 3, "reached 100%"},
        {"Overdue", 4, "past their expected completion date"}
    })
