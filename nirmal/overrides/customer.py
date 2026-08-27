import frappe


def validate_customer_email(doc, method=None):
    email = (doc.get("email_id") or "").strip()

    # Customer.email_id is populated from the primary Contact.
    if not email and doc.get("customer_primary_contact"):
        email = frappe.db.get_value(
            "Contact",
            doc.customer_primary_contact,
            "email_id",
        )

    # Check Contact Email child table as the final source.
    if not email and doc.get("customer_primary_contact"):
        email = frappe.db.get_value(
            "Contact Email",
            {
                "parent": doc.customer_primary_contact,
                "parenttype": "Contact",
                "email_id": ["is", "set"],
            },
            "email_id",
        )

    if not email:
        frappe.throw(
            "Email ID is mandatory when creating a Customer.",
            title="Email Required",
        )


def validate_customer_email_contact(doc, method=None):
    # 1. Customer email
    email = (doc.get("email_id") or "").strip()

    if email:
        return

    # 2. Primary Contact
    primary_contact = doc.get("customer_primary_contact")

    if primary_contact:
        # Check Contact.email_id
        email = (
            frappe.db.get_value(
                "Contact",
                primary_contact,
                "email_id",
            )
            or ""
        ).strip()

        if email:
            return

        # Check Contact Email child table
        email = (
            frappe.db.get_value(
                "Contact Email",
                {
                    "parent": primary_contact,
                    "parenttype": "Contact",
                    "email_id": ["is", "set"],
                },
                "email_id",
            )
            or ""
        ).strip()

        if email:
            return

    # 3. Nothing found
    frappe.throw(
        "Email ID is mandatory. Please provide an Email ID or add a Primary Contact with an Email ID.",
        title="Email Required",
    )


def validate_existing_customer_email(doc, method=None):
    if doc.is_new():
        return

    email = (doc.get("email_id") or "").strip()

    if email:
        return

    primary_contact = doc.get("customer_primary_contact")

    if primary_contact:
        email = (
            frappe.db.get_value(
                "Contact",
                primary_contact,
                "email_id",
            )
            or ""
        ).strip()

        if email:
            return

        email = (
            frappe.db.get_value(
                "Contact Email",
                {
                    "parent": primary_contact,
                    "parenttype": "Contact",
                    "email_id": ["is", "set"],
                },
                "email_id",
            )
            or ""
        ).strip()

        if email:
            return

    frappe.throw(
        "Email ID is mandatory. Please add an Email ID or a Primary Contact with an Email ID.",
        title="Email Required",
    )