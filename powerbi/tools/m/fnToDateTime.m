// Any cell value -> datetime or null. Excel cells arrive as datetimes; the
// ServiceNow API returns "yyyy-MM-dd HH:mm:ss" (UTC) or "yyyy-MM-dd".
(v as any) as nullable datetime =>
if v = null or v = "" then null
else if Value.Is(v, type datetime) then v
else if Value.Is(v, type date) then DateTime.From(v)
else if Value.Is(v, type number) then DateTime.From(v)
else
    let
        T = Text.Trim(Text.From(v)),
        Parsed =
            if Text.Length(T) = 19 then try DateTime.FromText(T, [Format = "yyyy-MM-dd HH:mm:ss", Culture = "en-US"]) otherwise null
            else if Text.Length(T) = 10 then try DateTime.From(Date.FromText(T, [Format = "yyyy-MM-dd", Culture = "en-US"])) otherwise null
            else try DateTime.FromText(T, [Culture = "en-US"]) otherwise null
    in
        Parsed
