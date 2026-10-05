// Global practices found in the requests or the survey.
let
    Values = List.Sort(List.Distinct(List.RemoveNulls(Requests[Practice] & Survey[Practice])))
in
    Table.FromList(Values, Splitter.SplitByNothing(), type table [Practice = text])
