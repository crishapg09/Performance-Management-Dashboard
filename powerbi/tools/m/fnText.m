// Cell -> trimmed text with inner whitespace collapsed; "" for blanks.
(v as any) as text =>
if v = null then "" else Text.Combine(List.Select(Text.SplitAny(Text.From(v), " #(tab)#(lf)#(cr)#(00A0)"), each _ <> ""), " ")
