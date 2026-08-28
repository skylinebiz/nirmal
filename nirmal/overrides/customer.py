import frappe
from frappe import _


def _get_customer_email(doc):
    """Resolve the effective email for a Customer: its own `email_id`,
    else the Primary Contact's `email_id`, else any email on the Primary
    Contact's Contact Email child table."""
    email = (doc.get("email_id") or "").strip()
    if email:
        return email

    primary_contact = doc.get("customer_primary_contact")
    if not primary_contact:
        return ""

    email = (
        frappe.db.get_value("Contact", primary_contact, "email_id") or ""
    ).strip()
    if email:
        return email

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
    return email


def validate_customer_email_contact(doc, method=None):
    """A Customer without an Email ID (own, or via its Primary Contact) is
    never blocked from saving. Instead, it is forced disabled until a
    Primary Contact with an Email ID is linked.

    Once an email exists, this hook does not touch `disabled` at all —
    enabling/disabling a Customer stays a manual, user-driven action, so
    an already-disabled Customer is never re-enabled automatically just
    because some other field was edited.
    """
    if _get_customer_email(doc):
        return

    # Already disabled and still no email: nothing changed, nothing to warn
    # about — stay silent instead of re-nagging on every unrelated save.
    if doc.disabled:
        return

    doc.disabled = 1
    frappe.msgprint(
        _(
            "This Customer has no Email ID and no Primary Contact with an "
            "Email ID, so it has been disabled. Link a Primary Contact with "
            "an Email ID, then enable the Customer manually."
        ),
        title=_("Customer Disabled"),
        indicator="orange",
    )
