// Quick Entry for Customer is provided by ERPNext's
// `frappe.ui.form.CustomerQuickEntryForm` (an alias of
// `ContactAddressQuickEntryForm`), which injects a synthetic "Email Id"
// field (`email_address`) that is NOT mandatory by default — so a
// Customer can be quick-entered with no email at all.
//
// Marking that field `reqd` here makes Frappe's own Dialog validation
// block the Save button until an email is entered, entirely client-side,
// before any request reaches the server.
frappe.provide("frappe.ui.form");

if (frappe.ui.form.CustomerQuickEntryForm) {
    const get_variant_fields = frappe.ui.form.CustomerQuickEntryForm.prototype.get_variant_fields;

    frappe.ui.form.CustomerQuickEntryForm.prototype.get_variant_fields = function () {
        const fields = get_variant_fields.call(this);
        const email_field = fields.find((df) => df.fieldname === "email_address");

        if (email_field) {
            email_field.reqd = 1;
        }

        return fields;
    };
}