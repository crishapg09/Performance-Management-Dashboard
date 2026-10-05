// The request columns the model uses (named as in the web dashboard's source export, which
// the rest of the model refers to), with the ServiceNow API field that supplies each one.
//
// Filled in from the fields of UNICEF's sn_customerservice_case API. Three are best guesses
// to confirm against a known case after the first refresh (see powerbi/README.md):
//   Case Report (the CSR request number)  <- parent        (if blank, the case number is used)
//   Office/Division                       <- u_business_area, else location (location came back empty)
//   Primary Programme Offer               <- u_category    (else try u_sub_category)
// Collaborators is not used by any page and stays unmapped.
// Several fields can be given as "a|b": the first one with a value is used.
// To see every field the API returns, open the ApiSample query.
// Kind: text = display value, date = stored UTC value, html = rich text.
#table(
    type table [Column = text, ApiField = text, Kind = text],
    {
        {"Case Report", "parent", "text"},
        {"Request Type", "u_request_type", "text"},
        {"Expected Start Date", "u_expected_start_date", "date"},
        {"Expected Completion Date", "u_expected_completion_date", "date"},
        {"Office/Division", "u_business_area|location", "text"},
        {"Region", "u_region", "text"},
        {"Requested For", "u_requested_for", "text"},
        {"Requested by", "internal_user", "text"},
        {"Short description", "short_description", "text"},
        {"Description", "description", "text"},
        {"Objectives", "u_objectives", "text"},
        {"Language", "u_language", "text"},
        {"Modality", "u_modality", "text"},
        {"Global Practice and Cross Sectoral Teams", "u_global_practice", "text"},
        {"Primary Programme Offer", "u_category", "text"},
        {"Assigned to", "assigned_to", "text"},
        {"Implementation Status", "u_implementation_status_rating", "text"},
        {"Created", "sys_created_on", "date"},
        {"Opened", "opened_at", "date"},
        {"Updated", "sys_updated_on", "date"},
        {"Resolved", "resolved_at", "date"},
        {"Closed", "closed_at", "date"},
        {"Resolution code", "resolution_code", "text"},
        {"State", "state", "text"},
        {"Details/Description", "description", "html"},
        {"Collaborators", "TODO_collaborators", "text"},
        {"Number", "number", "text"}
    }
)
