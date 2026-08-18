import frappe


def before_uninstall():
    module = "Nirmal"

    custom_fields = frappe.get_all(
        "Custom Field",
        filters={"module": module},
        fields=["name", "dt", "fieldname"],
    )

    for cf in custom_fields:
        # Delete the Custom Field
        frappe.delete_doc(
            "Custom Field",
            cf.name,
            ignore_permissions=True,
            force=True,
        )

    property_setters = frappe.get_all(
        "Property Setter",
        filters={"module": module},
        pluck="name",
    )

    for ps in property_setters:
        frappe.delete_doc(
            "Property Setter",
            ps,
            ignore_permissions=True,
            force=True,
        )
        
    frappe.clear_cache()