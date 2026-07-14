import frappe
from frappe.model.naming import getseries
from erpnext.accounts.utils import get_fiscal_year
from erpnext.selling.doctype.quotation.quotation import make_sales_order as erpnext_make_sales_order


COMPANY_PREFIX = "NGI"

def generate_reference_number(doc, method=None):
    # Skip if already generated
    if doc.custom_reference_number:
        return

    customer_alias = (
        frappe.db.get_value("Customer", doc.customer_name, "alias")
        or "NA"
    )

    fiscal_year = get_fiscal_year(
        doc.transaction_date,
        company=doc.company
    )[0]

    # Global running number
    sequence = getseries("NGI-QUOTATION-REF-", 5)

    reference = (
        f"{COMPANY_PREFIX}/"
        f"{customer_alias}/"
        f"Q/"
        f"{fiscal_year}/"
        f"{sequence}"
    )

    frappe.db.set_value(
        "Quotation",
        doc.name,
        "custom_reference_number",
        reference,
        update_modified=False,
    )

    doc.custom_reference_number = reference


def quotation_autoname(doc, method=None):
    customer_alias = (
        frappe.db.get_value("Customer", doc.customer_name, "alias")
        or "CID"
    )

    fiscal_year = get_fiscal_year(
        doc.transaction_date,
        company=doc.company
    )[0]

    sequence = getseries("NGI-QTN-", 5)

    doc.name = f"NGI/{customer_alias}/Q/{fiscal_year}/{sequence}"

@frappe.whitelist()
def make_sales_order(source_name, target_doc=None, args=None):
    source = frappe.get_doc("Quotation", source_name)

    # frappe.errprint("========== SOURCE QUOTATION ==========")
    # frappe.errprint(f"Quotation: {source.name}")
    # frappe.errprint(f"Range: {source.custom_delivery_date_range}")
    # frappe.errprint(f"Start Day: {source.custom_delivery_start_day}")
    # frappe.errprint(f"End Day: {source.custom_delivery_end_day}")

    sales_order = erpnext_make_sales_order(source_name, target_doc, args)

    # frappe.errprint("========== AFTER ERPNEXT MAPPING ==========")
    # frappe.errprint(f"Range: {sales_order.get('custom_delivery_date_range')}")
    # frappe.errprint(f"Start Day: {sales_order.get('custom_delivery_start_day')}")
    # frappe.errprint(f"End Day: {sales_order.get('custom_delivery_end_day')}")

    sales_order.custom_delivery_date_range = source.custom_delivery_date_range
    sales_order.custom_delivery_start_day = source.custom_delivery_start_day
    sales_order.custom_delivery_end_day = source.custom_delivery_end_day

    # frappe.errprint("========== AFTER ASSIGNMENT ==========")
    # frappe.errprint(f"Range: {sales_order.custom_delivery_date_range}")
    # frappe.errprint(f"Start Day: {sales_order.custom_delivery_start_day}")
    # frappe.errprint(f"End Day: {sales_order.custom_delivery_end_day}")

    # frappe.errprint("========== AS DICT ==========")
    # frappe.errprint(sales_order.as_dict())

    return sales_order