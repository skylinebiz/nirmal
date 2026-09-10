import frappe
from frappe import _


def validate_contact_email_on_submit(doc, method=None):
    """Block submit if the transaction has no Contact Email.

    Wired to `before_submit` only — saving or amending a draft without a
    Contact Email is still allowed; it's enforced only at the point of
    submission.
    """
    if not (doc.get("contact_email") or "").strip():
        frappe.throw(
            _("Email does not exist for Customer. Please add a Email for this Customer before submitting."),
            title=_("Email Required"),
        )
