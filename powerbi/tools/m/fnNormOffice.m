// Office name -> matching key. Port of norm() in app/src/lib/regionMap.ts:
// lower-case, drop "( … )", turn . , ' - into spaces, drop filler words
// (the, of, and, rep, republic, dem, state, united, people s, peoples, island s),
// collapse spaces.
(raw as nullable any) as text =>
let
    Lower = Text.Lower(if raw = null then "" else Text.From(raw)),
    NoParens = List.Accumulate(
        Text.ToList(Lower),
        [Out = "", Depth = 0],
        (s, c) =>
            if c = "(" then [Out = s[Out], Depth = s[Depth] + 1]
            else if c = ")" and s[Depth] > 0 then [Out = s[Out] & " ", Depth = s[Depth] - 1]
            else if s[Depth] > 0 then s
            else [Out = s[Out] & c, Depth = s[Depth]]
    )[Out],
    Spaced = Text.Combine(List.Transform(Text.ToList(NoParens), each if List.Contains({".", ",", "'", "-"}, _) then " " else _)),
    Tokens = List.Select(Text.SplitAny(Spaced, " #(tab)#(lf)#(cr)#(00A0)"), each _ <> ""),
    Filler = {"the", "of", "and", "rep", "republic", "dem", "state", "united", "peoples"},
    N = List.Count(Tokens),
    Kept = List.Transform(
        List.Numbers(0, N),
        (i) =>
            let
                Tok = Tokens{i},
                Prev = if i > 0 then Tokens{i - 1} else "",
                Next = if i < N - 1 then Tokens{i + 1} else ""
            in
                if List.Contains(Filler, Tok) then null
                else if Tok = "people" and Next = "s" then null
                else if Tok = "island" then null
                else if Tok = "s" and (Prev = "people" or Prev = "island") then null
                else Tok
    )
in
    Text.Combine(List.RemoveNulls(Kept), " ")
