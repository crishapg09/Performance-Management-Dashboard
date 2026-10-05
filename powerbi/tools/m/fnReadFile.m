// A local path or a SharePoint/OneDrive URL -> file contents.
(path as text) as binary =>
if Text.StartsWith(Text.Lower(path), "http") then Web.Contents(path) else File.Contents(path)
