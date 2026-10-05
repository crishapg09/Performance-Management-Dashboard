// Canonical programme offer. Port of mapOffer() in app/src/lib/offerMap.ts:
// non-breaking spaces and hyphens become spaces, lower-case, collapse spaces,
// then look up; unrecognised values pass through trimmed.
(raw as nullable any) as text =>
let
    S = if raw = null then "" else Text.From(raw),
    Key = Text.Combine(List.Select(Text.SplitAny(Text.Lower(Text.Replace(Text.Replace(S, "#(00A0)", " "), "-", " ")), " #(tab)#(lf)#(cr)"), each _ <> ""), " "),
    Pos = List.PositionOf(OfferLookup[Key], Key)
in
    if Pos >= 0 then OfferLookup[Offer]{Pos} else Text.Trim(S)
