import frappe
from frappe.model.naming import getseries
from erpnext.accounts.utils import get_fiscal_year
from erpnext.selling.doctype.quotation.quotation import make_sales_order as erpnext_make_sales_order
from erpnext.selling.doctype.sales_order.sales_order import (
    make_sales_invoice as make_sales_invoice_from_so,
)

from erpnext.selling.doctype.quotation.quotation import (
    make_sales_invoice as make_sales_invoice_from_quotation,
)

from erpnext.selling.doctype.sales_order.sales_order import (
    make_delivery_note as erpnext_make_delivery_note,
)


from erpnext.accounts.doctype.sales_invoice.sales_invoice import (
    make_delivery_note as erpnext_make_delivery_note_from_si,
)

from frappe.model.naming import make_autoname


@frappe.whitelist()
def make_sales_order(source_name, target_doc=None, args=None):
    source = frappe.get_doc("Quotation", source_name)

    sales_order = erpnext_make_sales_order(source_name, target_doc, args)

    # Parent fields
    sales_order.custom_quotation_no = source.name
    sales_order.custom_delivery_date_range = source.custom_delivery_date_range
    sales_order.custom_delivery_start_day = source.custom_delivery_start_day
    sales_order.custom_delivery_end_day = source.custom_delivery_end_day

    # Map Quotation Items by quotation_item
    quotation_items = {
        item.name: item for item in source.items
    }

    for so_item in sales_order.items:
        quotation_item = quotation_items.get(so_item.quotation_item)

        if quotation_item:
            so_item.custom_delivery_date_range = quotation_item.custom_delivery_date_range
            so_item.custom_delivery_start_day = quotation_item.custom_delivery_start_day
            so_item.custom_delivery_end_day = quotation_item.custom_delivery_end_day

    return sales_order


@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None, args=None):
    doctype = (
        "Sales Order"
        if frappe.db.exists("Sales Order", source_name)
        else "Quotation"
    )

    source = frappe.get_doc(doctype, source_name)

    # frappe.log_error(
    #     title= doctype + source_name,
    #     message=frappe.as_json(source.as_dict(), indent=2)
    # )

    if doctype == "Sales Order":
        sales_invoice = make_sales_invoice_from_so(
            source_name,
            target_doc,
            args,
        )
    else:
        sales_invoice = make_sales_invoice_from_quotation(
            source_name,
            target_doc,
            args,
        )

    sales_invoice.custom_quotation_no = source.custom_quotation_no or source.name 
    sales_invoice.custom_delivery_date_range = source.custom_delivery_date_range
    sales_invoice.custom_delivery_start_day = source.custom_delivery_start_day
    sales_invoice.custom_delivery_end_day = source.custom_delivery_end_day

    source_items = {d.name: d for d in source.items}

    for si_item in sales_invoice.items:
        source_item = source_items.get(
            si_item.so_detail if doctype == "Sales Order" else si_item.quotation_item
        )

        if source_item:
            si_item.custom_delivery_date_range = source_item.custom_delivery_date_range
            si_item.custom_delivery_start_day = source_item.custom_delivery_start_day
            si_item.custom_delivery_end_day = source_item.custom_delivery_end_day

    return sales_invoice



@frappe.whitelist()
def make_delivery_note(source_name, target_doc=None, args=None):
    delivery_note = erpnext_make_delivery_note(source_name, target_doc)

    sales_order = frappe.get_doc("Sales Order", source_name)

    # Parent fields
    delivery_note.custom_quotation_no = sales_order.custom_quotation_no

    delivery_note.custom_delivery_date_range = sales_order.custom_delivery_date_range
    delivery_note.custom_delivery_start_day = sales_order.custom_delivery_start_day
    delivery_note.custom_delivery_end_day = sales_order.custom_delivery_end_day

    # Map Sales Order Items by their name
    so_items = {d.name: d for d in sales_order.items}

    for dn_item in delivery_note.items:
        if not dn_item.so_detail:
            continue

        so_item = so_items.get(dn_item.so_detail)
        if not so_item:
            continue

        # Item custom fields
        dn_item.custom_delivery_date_range = so_item.custom_delivery_date_range
        dn_item.custom_delivery_start_day = so_item.custom_delivery_start_day
        dn_item.custom_delivery_end_day = so_item.custom_delivery_end_day

    return delivery_note


@frappe.whitelist()
def make_delivery_note_from_sales_invoice(source_name, target_doc=None, args=None):
    delivery_note = erpnext_make_delivery_note_from_si(source_name, target_doc)

    sales_invoice = frappe.get_doc("Sales Invoice", source_name)

    # frappe.log_error(
    #     title= source_name,
    #     message=frappe.as_json(sales_invoice.as_dict(), indent=2)
    # )

    # Parent fields
    delivery_note.custom_delivery_date_range = sales_invoice.custom_delivery_date_range
    delivery_note.custom_delivery_start_day = sales_invoice.custom_delivery_start_day
    delivery_note.custom_delivery_end_day = sales_invoice.custom_delivery_end_day

    # Map Sales Invoice Items by their name
    si_items = {d.name: d for d in sales_invoice.items}

    for dn_item in delivery_note.items:
        if not dn_item.si_detail:
            continue

        si_item = si_items.get(dn_item.si_detail)
        if not si_item:
            continue

        # Item custom fields
        dn_item.custom_delivery_date_range = si_item.custom_delivery_date_range
        dn_item.custom_delivery_start_day = si_item.custom_delivery_start_day
        dn_item.custom_delivery_end_day = si_item.custom_delivery_end_day

    return delivery_note