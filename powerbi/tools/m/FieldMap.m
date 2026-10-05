// The request columns the model uses (named as in the web dashboard's source export, which
// the rest of the model refers to), with the ServiceNow API field that supplies each one.
//
// FILL IN the ApiField values that start with "TODO_": they are custom fields on the
// case table whose internal names (u_…) are specific to your instance. Find them in
// ServiceNow by right-clicking a field label on a case form ("Show - 'u_…'"), or ask
// whoever built your API. A TODO_ field loads as blank rather than failing.
// Kind: text = display value, date = stored UTC value, html = rich text.
#table(
    type table [Column = text, ApiField = text, Kind = text],
    {
        {"Case Report", "TODO_request_number", "text"},
        {"Request Type", "TODO_request_type", "text"},
        {"Expected Start Date", "TODO_expected_start_date", "date"},
        {"Expected Completion Date", "TODO_expected_completion_date", "date"},
        {"Office/Division", "TODO_office_division", "text"},
        {"Region", "TODO_region", "text"},
        {"Requested For", "TODO_requested_for", "text"},
        {"Requested by", "opened_by", "text"},
        {"Short description", "short_description", "text"},
        {"Description", "description", "text"},
        {"Objectives", "TODO_objectives", "text"},
        {"Language", "TODO_language", "text"},
        {"Modality", "TODO_modality", "text"},
        {"Global Practice and Cross Sectoral Teams", "TODO_global_practice", "text"},
        {"Primary Programme Offer", "TODO_primary_programme_offer", "text"},
        {"Assigned to", "assigned_to", "text"},
        {"Implementation Status", "TODO_implementation_status", "text"},
        {"Created", "sys_created_on", "date"},
        {"Opened", "opened_at", "date"},
        {"Updated", "sys_updated_on", "date"},
        {"Resolved", "resolved_at", "date"},
        {"Closed", "closed_at", "date"},
        {"Resolution code", "resolution_code", "text"},
        {"State", "state", "text"},
        {"Details/Description", "TODO_details_description", "html"},
        {"Collaborators", "TODO_collaborators", "text"},
        {"Number", "number", "text"}
    }
)
