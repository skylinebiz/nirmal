import frappe


def execute():
    quotations = frappe.get_all(
        "Quotation",
        filters={
            "custom_purchase_enquiry_by": ["is", "set"]
        },
        fields=[
            "name",
            "custom_purchase_enquiry_by",
        ],
    )

    for quotation in quotations:
        value = quotation.custom_purchase_enquiry_by

        if not value:
            continue

        content = f"Purchase Enquiry By: {value}"

        # Prevent duplicate comments
        if frappe.db.exists(
            "Comment",
            {
                "reference_doctype": "Quotation",
                "reference_name": quotation.name,
                "comment_type": "Comment",
                "content": content,
            },
        ):
            continue

        frappe.get_doc({
            "doctype": "Comment",
            "comment_type": "Comment",
            "reference_doctype": "Quotation",
            "reference_name": quotation.name,
            "content": content,
        }).insert(ignore_permissions=True)