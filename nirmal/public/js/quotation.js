frappe.ui.form.on("Quotation", {
    refresh(frm) {
        // New document -> read only
        frm.set_df_property(
            "custom_reference_number",
            "read_only",
            frm.is_new() ? 1 : 0
        );
    },

    custom_delivery_date_range(frm) {
        update_quotation_delivery_details(frm);
    },

    items_add(frm) {
        update_quotation_delivery_details(frm);
    }
});


function update_quotation_delivery_details(frm) {
    (frm.doc.items || []).forEach(row => {
        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_date_range",
            frm.doc.custom_delivery_date_range
        );

        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_start_day",
            frm.doc.custom_delivery_start_day
        );

        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_end_day",
            frm.doc.custom_delivery_end_day
        );
    });

    frm.refresh_field("items");
}


frappe.ui.form.on("Sales Order Item", {
    items_add(frm, cdt, cdn) {
        console.log("Row Added");

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
});


frappe.ui.form.on("Quotation Item", {
    items_add(frm, cdt, cdn) {
        console.log("Row Added");

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
});


frappe.ui.form.on("Sales Order", {
    refresh(frm) {
        frm.delivery_date_range_cache ||= {};
        if (frm.delivery_range_changed === undefined) {
            frm.delivery_range_changed = false;
        }

        if (frm.is_new()) {
            frm.add_custom_button(__("Get Revised Dates"), function () {

                apply_revised_date(
                    frm,
                    frm.doc.custom_delivery_end_day
                );

            });
        }
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

            frm.set_value(
                "custom_delivery_date_range",
                r.message.custom_delivery_date_range
            );

            frm.set_value(
                "custom_delivery_start_day",
                r.message.custom_delivery_start_day
            );

            frm.set_value(
                "custom_delivery_end_day",
                r.message.custom_delivery_end_day
            );

            update_so_delivery_details(frm);
        });
    },

    custom_delivery_date_range(frm) {
        frm.delivery_range_changed = true;

        const range = frm.doc.custom_delivery_date_range;
        if (!range) return;

        // Return cached document if available
        if (frm.delivery_date_range_cache[range]) {
            const doc = frm.delivery_date_range_cache[range];

            frm.set_value("custom_delivery_start_day", doc.start_days);
            frm.set_value("custom_delivery_end_day", doc.end_days);

            update_so_delivery_details(frm);
            return;
        }

        // Fetch only once
        frappe.db.get_doc("Delivery Date Range", range).then(doc => {
            frm.delivery_date_range_cache[range] = doc;

            frm.set_value("custom_delivery_start_day", doc.start_days);
            frm.set_value("custom_delivery_end_day", doc.end_days);

            update_so_delivery_details(frm);
        });
    },

    custom_delivery_start_day(frm) {
        update_so_delivery_details(frm);
    },

    custom_delivery_end_day(frm) {
        update_so_delivery_details(frm);
    }
});


function update_so_delivery_details(frm) {
    (frm.doc.items || []).forEach(row => {
        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_date_range",
            frm.doc.custom_delivery_date_range
        );

        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_start_day",
            frm.doc.custom_delivery_start_day
        );

        frappe.model.set_value(
            row.doctype,
            row.name,
            "custom_delivery_end_day",
            frm.doc.custom_delivery_end_day
        );
    });

    frm.refresh_field("items");
}


function apply_revised_date(frm, end_day) {


    if (!end_day) {
        frappe.msgprint(__("Please select a Delivery Date Range."));
        return;
    }

    if (!frm.doc.transaction_date) {
        frappe.msgprint(__("Transaction Date is required."));
        return;
    }

    const revised_date = frappe.datetime.add_days(
        frm.doc.transaction_date,
        cint(end_day)
    );

    frm.set_value("delivery_date", revised_date);

    (frm.doc.items || []).forEach((row, index) => {
        frappe.model.set_value(
            row.doctype,
            row.name,
            "delivery_date",
            revised_date
        );
    });

    frm.refresh_field("items");

    frappe.show_alert({
        message: __("Delivery dates updated successfully."),
        indicator: "green"
    });
}