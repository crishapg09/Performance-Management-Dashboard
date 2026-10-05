// Request types found in the requests or the survey ("Unclassified" = a response not matched to a request).
let
    Values = List.Sort(List.Distinct(List.RemoveNulls(Requests[Request type] & Survey[Request type])))
in
    Table.FromList(Values, Splitter.SplitByNothing(), type table [Request type = text])
