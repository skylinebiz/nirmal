frappe.ui.form.on("Quotation", {
    refresh(frm) {
        // New document -> read only
        frm.set_df_property(
            "custom_reference_number",
            "read_only",
            frm.is_new() ? 1 : 0
        );
    },

    delivery_date_range(frm) {
        if (!frm.doc.custom_delivery_end_days) return;

        const delivery_date = frappe.datetime.add_days(
            frm.doc.transaction_date,
            frm.doc.custom_delivery_end_days
        );

        frm.set_value("delivery_date", delivery_date);

        (frm.doc.items || []).forEach(row => {
            frappe.model.set_value(
                row.doctype,
                row.name,
                "delivery_date",
                delivery_date
            );
        });

        frm.refresh_field("items");
    }
});


frappe.ui.form.on("Sales Order", {
    refresh(frm) {
        if (frm.is_new()) {
            frm.add_custom_button(__("Get Revised Dates"), function () {
                if (!frm.doc.custom_delivery_end_day) {
                    frappe.msgprint(__("Please select a Delivery Date Range."));
                    return;
                }

                if (!frm.doc.transaction_date) {
                    frappe.msgprint(__("Transaction Date is required."));
                    return;
                }

                const revised_date = frappe.datetime.add_days(
                    frm.doc.transaction_date,
                    cint(frm.doc.custom_delivery_end_day)
                );

                // Update Sales Order delivery date
                frm.set_value("delivery_date", revised_date);

                // Update all item delivery dates
                (frm.doc.items || []).forEach(row => {
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
            });
        }
    },

    after_mapping(frm) {
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
        });
    }
});