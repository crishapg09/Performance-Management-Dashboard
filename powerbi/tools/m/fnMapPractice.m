// Port of mapPractice(): "Other" and "Innovation" fold into Programme Policy & Strategy.
(raw as nullable any) as text =>
let
    S = if raw = null then "" else Text.From(raw),
    Key = Text.Combine(List.Select(Text.SplitAny(Text.Lower(Text.Trim(S)), " #(tab)#(lf)#(cr)#(00A0)"), each _ <> ""), " ")
in
    if List.Contains({"other", "innovation"}, Key) then "Programme Policy & Strategy" else Text.Trim(S)
