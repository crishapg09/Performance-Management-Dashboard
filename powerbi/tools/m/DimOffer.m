// Programme offers (canonical names) found in the requests or the survey.
let
    Values = List.Sort(List.Distinct(List.RemoveNulls(Requests[Programme offer] & Survey[Programme offer])))
in
    Table.FromList(Values, Splitter.SplitByNothing(), type table [Programme offer = text])
