// True when a description says nothing ("", "test", "n/a", "please add a description…").
// Port of is_placeholder() in scripts/extract.py.
(t as nullable text) as logical =>
let
    N = Text.Trim(Text.TrimEnd(Text.Trim(Text.Lower(if t = null then "" else t)), {".", "!", ":", ";", ","})),
    Exact = {"", "na", "n/a", "n.a.", "n", "nil", "none", "undefined", "missing", "tbd", "tba", "test", "testing", "tests", ".", "-", "--", "...", "x", "xx", "xxx", "?", "pending"},
    Prefixes = {"please add", "add description", "add decription", "add descripton", "please provide more", "to be added", "to be defined", "to be confirmed", "description to follow", "test ", "testing "}
in
    List.Contains(Exact, N) or List.AnyTrue(List.Transform(Prefixes, (p) => Text.StartsWith(N, p)))
