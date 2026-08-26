import frappe


def execute():
    custom_field = "Quotation-custom_purchase_enquiry_by"

    if frappe.db.exists("Custom Field", custom_field):
        frappe.delete_doc(
            "Custom Field",
            custom_field,
            force=True,
            ignore_permissions=True,
        )

    frappe.clear_cache(doctype="Quotation")