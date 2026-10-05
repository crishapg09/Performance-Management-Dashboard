// One row per survey response, from the survey workbook alone (no ServiceNow call):
// ratings, comment, coded themes, with the corrections and exclusions applied.
// Port of scripts/extract_survey.py. Survey adds the request each response rates.
let
    Book = Excel.Workbook(fnReadFile(SurveyWorkbookPath), [UseHeaders = false, DelayTypes = true, InferSheetDimensions = true]),
    Merged = fnSurveySheet(Book, "Merged data"),
    // the merge blanks some open-text answers, so the raw sheet is the authority on what was written
    Responses = fnSurveySheet(Book, "Response data"),
    RawComments = Table.Buffer(Table.FromRows(
        List.Transform(Table.ToRecords(Responses), each {fnText([ID]), fnText(Record.FieldOrDefault(_, "Open comment", null))}),
        {"ID", "Raw comment"})),
    Scales = [
        Satisfaction = [#"Very dissatisfied" = 1, Dissatisfied = 2, #"Neither satisfied nor dissatisfied" = 3, Satisfied = 4, #"Very satisfied" = 5],
        Quality = [Poor = 1, Fair = 2, Good = 3, #"Very Good" = 4, Excellent = 5],
        Timeliness = [#"Much too late" = 1, #"Too late" = 2, Acceptable = 3, Timely = 4, #"Very Timely" = 5],
        Contribution = [#"No Contribution" = 1, #"Limited Contribution" = 2, #"Moderate Contribution" = 3, #"Significant Contribution" = 4, #"Very Significant Contribution" = 5]
    ],
    Score = (scale as text, label as text) as nullable number => Record.FieldOrDefault(Record.Field(Scales, scale), label, null),
    NonSubstantive = {"", "n/a", "na", "no comment", "no comments", "none", "nil", ".", "-", "..", "..."},

    Rows = List.Transform(Table.ToRecords(Merged), (r) =>
        let
            Id = fnText(r[ID]),
            CaseNo = fnText(Record.FieldOrDefault(r, "TA Case Number", null)),
            RawPos = List.PositionOf(RawComments[ID], Id),
            RawBody = if RawPos >= 0 then RawComments[Raw comment]{RawPos} else "",
            Body = if RawBody <> "" then RawBody else fnText(Record.FieldOrDefault(r, "Open comment", null)),
            Written = Body <> "",
            Substantive = Written and not List.Contains(NonSubstantive, Text.TrimEnd(Text.Lower(Text.Trim(Body)), {".", "!", "?"})),
            ManualPos = List.PositionOf(ManualCoding[ID], Id),
            Manual = if ManualPos >= 0 then ManualCoding{ManualPos} else null,
            Positive = if Manual <> null then Manual[Positive] else fnText(Record.FieldOrDefault(r, "Positive Themes", null)),
            Improvement = if Manual <> null then Manual[Improvement] else fnText(Record.FieldOrDefault(r, "Improvement Theme", null)),
            Flag = if Manual <> null then Manual[Flag] else fnText(Record.FieldOrDefault(r, "Data-quality Flag", null)),
            SatLabel = fnText(Record.FieldOrDefault(r, "Satisfaction", null)),
            FixPos = List.PositionOf(SatisfactionCorrections[Case number], CaseNo),
            SatFixed = if FixPos >= 0 and SatLabel = SatisfactionCorrections[From]{FixPos} then SatisfactionCorrections[To]{FixPos} else SatLabel,
            Rec = try Number.From(fnText(Record.FieldOrDefault(r, "Recommend 0–10", null))) otherwise null
        in
            [
                Response ID = Id,
                Survey office raw = fnText(Record.FieldOrDefault(r, "Country Office", null)),
                Case number = CaseNo,
                Comment = Body,
                Written = if Written then "Yes" else "No",
                Substantive = if Substantive then "Yes" else "No",
                Positive themes = Positive,
                Improvement theme = if Improvement = "" then null else Improvement,
                Data quality flag = if Flag = "" then null else Flag,
                Satisfaction = Score("Satisfaction", SatFixed),
                Quality = Score("Quality", fnText(Record.FieldOrDefault(r, "Quality", null))),
                Timeliness = Score("Timeliness", fnText(Record.FieldOrDefault(r, "Timeliness", null))),
                Contribution = Score("Contribution", fnText(Record.FieldOrDefault(r, "Contribution", null))),
                Recommend = Rec
            ]
    ),
    Table0 = Table.FromRecords(Rows),
    Kept = Table.SelectRows(Table0, each not List.Contains(ExcludedResponses, [Response ID]))
in
    Kept
