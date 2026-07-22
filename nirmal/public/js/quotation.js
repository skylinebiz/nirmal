const DELIVERY_CONFIG = {
    "Quotation": {
        date_field: null,
        parent_date: null,
        source_doctypes: []
    },
    "Sales Order": {
        date_field: "delivery_date",
        parent_date: "transaction_date",
        source_doctypes: ["Quotation"]
    },
    "Sales Invoice": {
        date_field: "due_date",
        parent_date: "posting_date",
        source_doctypes: ["Sales Order", "Quotation"]
    }
};

function setup_delivery_form(frm) {
    frm.delivery_date_range_cache ||= {};
    frm.delivery_range_changed ??= false;

    const config = DELIVERY_CONFIG[frm.doctype];

    if (!config.date_field || !frm.is_new()) return;

    frm.add_custom_button(__("Get Revised Dates"), () => {
        apply_revised_date(frm, {
            base_date: config.parent_date,
            parent_field: config.date_field,
            child_field: config.date_field,
            end_day: frm.doc.custom_delivery_end_day
        });
    });
}

async function load_delivery_range(frm) {
    const range = frm.doc.custom_delivery_date_range;
    if (!range) return;

    frm.delivery_date_range_cache ||= {};

    let doc = frm.delivery_date_range_cache[range];

    if (!doc) {
        doc = await frappe.db.get_doc("Delivery Date Range", range);
        frm.delivery_date_range_cache[range] = doc;
    }

    frm.set_value("custom_delivery_start_day", doc.start_days);
    frm.set_value("custom_delivery_end_day", doc.end_days);

    update_delivery_details(frm);
}

frappe.ui.form.on("Quotation", {
    custom_delivery_date_range(frm) {
        update_delivery_details(frm);
    },

    items_add(frm) {
        update_delivery_details(frm);
    },
    
    party_name(frm) {
        if (!frm.doc.party_name) {
            frm.set_value("custom_customer_alias", "");
            return;
        }

        frappe.db.get_value(
            "Customer",
            frm.doc.party_name,
            "alias"
        ).then(r => {
            frm.set_value(
                "custom_customer_alias",
                r.message?.alias || ""
            );
        });
    }
});


frappe.ui.form.on("Sales Order", {
    refresh(frm) {
        setup_delivery_form(frm);
    },

    after_mapping(frm) {
        frm.delivery_range_changed = false;

        if (!frm.doc.items || !frm.doc.items.length) return;

        const quotation = frm.doc.items[0].prevdoc_docname;
        if (!quotation) return;

        frappe.db.get_value(
            "Quotation",
            quotation,
            [
                "custom_delivery_date_range",
                "custom_delivery_start_day",
                "custom_delivery_end_day"
            ]
        ).then(r => {
            if (!r.message) return;

            const revised_date = frappe.datetime.add_days(
                frm.doc.transaction_date,
                cint(r.message.custom_delivery_end_day)
            );

            frm.set_value("delivery_date", revised_date);

            set_delivery_fields_from_doc(frm, r.message);

            update_delivery_details(frm);
        });
    },

    custom_delivery_date_range(frm) {
        load_delivery_range(frm);
    },

    custom_delivery_start_day(frm) {
        update_delivery_details(frm);
    },

    custom_delivery_end_day(frm) {
        update_delivery_details(frm);
    }
});

//////////////

frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        setup_delivery_form(frm);
    },

    after_mapping(frm) {
        frm.delivery_range_changed = false;

        if (!frm.doc.items || !frm.doc.items.length) return;

        const sales_order = frm.doc.items[0].sales_order;
        const quotation = frm.doc.items[0].prevdoc_docname;

        // First try Sales Order
        if (sales_order) {
            frappe.db.get_value(
                "Sales Order",
                sales_order,
                [
                    "custom_delivery_date_range",
                    "custom_delivery_start_day",
                    "custom_delivery_end_day"
                ]
            ).then(r => {
                if (!r.message) return;

                set_delivery_fields_from_doc(frm, r.message);

                const revised_date = frappe.datetime.add_days(
                    frm.doc.posting_date,
                    cint(r.message.custom_delivery_end_day)
                );

                frm.set_value("due_date", revised_date);

                update_delivery_details(frm);
            });

            return;
        }

        // Fallback to Quotation (if available)
        if (quotation) {
            frappe.db.get_value(
                "Quotation",
                quotation,
                [
                    "custom_delivery_date_range",
                    "custom_delivery_start_day",
                    "custom_delivery_end_day"
                ]
            ).then(r => {
                if (!r.message) return;

                set_delivery_fields_from_doc(frm, r.message);

                const revised_date = frappe.datetime.add_days(
                    frm.doc.posting_date,
                    cint(r.message.custom_delivery_end_day)
                );

                frm.set_value("due_date", revised_date);

                update_delivery_details(frm);
            });
        }
    },

    custom_delivery_date_range(frm) {
        load_delivery_range(frm);
    },

    custom_delivery_start_day(frm) {
        update_delivery_details(frm);
    },

    custom_delivery_end_day(frm) {
        update_delivery_details(frm);
    }
});


function apply_si_revised_date(frm, end_day) {
    if (!end_day) {
        frappe.msgprint(__("Please select a Delivery Date Range."));
        return;
    }

    if (!frm.doc.posting_date) {
        frappe.msgprint(__("Posting Date is required."));
        return;
    }

    const revised_date = frappe.datetime.add_days(
        frm.doc.posting_date,
        cint(end_day)
    );

    frm.set_value("due_date", revised_date);

    (frm.doc.items || []).forEach(row => {
        frappe.model.set_value(
            row.doctype,
            row.name,
            "due_date",
            revised_date
        );
    });

    // frm.refresh_field("items");

    frappe.show_alert({
        message: __("Delivery dates updated successfully."),
        indicator: "green"
    });
}


function update_delivery_details(frm) {
    (frm.doc.items || []).forEach(row => {
        frappe.model.set_value(row.doctype, row.name,
            "custom_delivery_date_range",
            frm.doc.custom_delivery_date_range
        );

        frappe.model.set_value(row.doctype, row.name,
            "custom_delivery_start_day",
            frm.doc.custom_delivery_start_day
        );

        frappe.model.set_value(row.doctype, row.name,
            "custom_delivery_end_day",
            frm.doc.custom_delivery_end_day
        );
    });

    // frm.refresh_field("items");
}

[
    "Quotation Item",
    "Sales Order Item",
    "Sales Invoice Item"
].forEach(doctype => {

    frappe.ui.form.on(doctype, {
        items_add(frm, cdt, cdn) {
            set_delivery_fields(cdt, cdn, frm);
        }
    });

});


function set_delivery_fields(cdt, cdn, frm) {
    frappe.model.set_value(
        cdt,
        cdn,
        "custom_delivery_date_range",
        frm.doc.custom_delivery_date_range
    );

    frappe.model.set_value(
        cdt,
        cdn,
        "custom_delivery_start_day",
        frm.doc.custom_delivery_start_day
    );

    frappe.model.set_value(
        cdt,
        cdn,
        "custom_delivery_end_day",
        frm.doc.custom_delivery_end_day
    );
}


function apply_revised_date(
    frm,
    {
        base_date,
        parent_field,
        child_field,
        end_day
    }
) {
    if (!end_day) {
        frappe.msgprint(__("Please select a Delivery Date Range."));
        return;
    }

    if (!frm.doc[base_date]) {
        frappe.msgprint(__("Date is required."));
        return;
    }

    const revised_date = frappe.datetime.add_days(
        frm.doc[base_date],
        cint(end_day)
    );

    frm.set_value(parent_field, revised_date);

    (frm.doc.items || []).forEach(row => {
        frappe.model.set_value(
            row.doctype,
            row.name,
            child_field,
            revised_date
        );
    });

    // frm.refresh_field("items");

    frappe.show_alert({
        message: __("Delivery dates updated successfully."),
        indicator: "green"
    });
}

function set_delivery_fields_from_doc(frm, doc) {
    frm.set_value("custom_delivery_date_range", doc.custom_delivery_date_range);
    frm.set_value("custom_delivery_start_day", doc.custom_delivery_start_day);
    frm.set_value("custom_delivery_end_day", doc.custom_delivery_end_day);
}