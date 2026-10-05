// Port of mapType(): both vocabularies the source has used fold onto Big Ticket / Routine.
(raw as nullable any) as text =>
let
    S = if raw = null then "" else Text.From(raw),
    Key = Text.Combine(List.Select(Text.SplitAny(Text.Lower(Text.Trim(S)), " #(tab)#(lf)#(cr)#(00A0)"), each _ <> ""), " ")
in
    if List.Contains({"big ticket", "big ticket item", "big-ticket"}, Key) then "Big Ticket"
    else if List.Contains({"routine", "regular"}, Key) then "Routine"
    else Text.Trim(S)
