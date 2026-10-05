// The ServiceNow "Case Report" Excel export (first sheet). Used when
// DataSource = "Excel export": handy for checking the model against the files
// the current dashboard was built from. InferSheetDimensions works around the
// export's bogus sheet-size metadata.
let
    Book = Excel.Workbook(fnReadFile(ExcelExportPath), [UseHeaders = false, DelayTypes = true, InferSheetDimensions = true]),
    Sheet = Table.SelectRows(Book, each [Kind] = "Sheet"){0}[Data],
    Promoted = Table.PromoteHeaders(Sheet, [PromoteAllScalars = true]),
    Selected = Table.SelectColumns(Promoted, FieldMap[Column], MissingField.UseNull)
in
    Selected
