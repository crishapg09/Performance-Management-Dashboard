// Details/Description is rich text: every tag becomes a space, common entities
// are decoded, whitespace collapses. Port of clean_html() in scripts/extract.py.
(v as nullable any) as text =>
if v = null then "" else
let
    S = Text.From(v),
    Parts = Text.Split(S, "<"),
    NoTags = List.First(Parts) & Text.Combine(List.Transform(List.Skip(Parts, 1), each " " & Text.AfterDelimiter(_, ">")), ""),
    Entities = {{"&nbsp;", " "}, {"&#160;", " "}, {"&lt;", "<"}, {"&gt;", ">"}, {"&quot;", """"}, {"&#39;", "'"}, {"&apos;", "'"}, {"&rsquo;", "’"}, {"&lsquo;", "‘"}, {"&rdquo;", "”"}, {"&ldquo;", "“"}, {"&ndash;", "–"}, {"&mdash;", "—"}, {"&amp;", "&"}},
    Decoded = List.Accumulate(Entities, NoTags, (s, e) => Text.Replace(s, e{0}, e{1})),
    Collapsed = Text.Combine(List.Select(Text.SplitAny(Decoded, " #(tab)#(lf)#(cr)#(00A0)"), each _ <> ""), " ")
in
    Collapsed
