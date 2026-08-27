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
    },

    async customer(frm) {
        await toggle_export_section(frm);
    },

    async customer_address(frm) {
        await toggle_export_section(frm);
    },

    async company(frm) {
        await toggle_export_section(frm);
    },

    async refresh(frm) {
        await toggle_export_section(frm);
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

async function toggle_export_section(frm) {
    // Hide by default
    frm.set_df_property("custom_export_section", "hidden", 1);

    if (!frm.doc.party_name || !frm.doc.company) {
        return;
    }

    const [company_data, customer_address] = await Promise.all([
        frappe.db.get_value(
            "Company",
            frm.doc.company,
            "country"
        ),

        frm.doc.customer_address
            ? frappe.db.get_value(
                "Address",
                frm.doc.customer_address,
                "country"
            )
            : null
    ]);

    const company_country = company_data?.message?.country;
    const customer_country = customer_address?.message?.country;

    if (!company_country || !customer_country) {
        return;
    }

    const is_overseas_customer =
        customer_country !== company_country;


    frm.set_df_property(
        "custom_export_section",
        "hidden",
        !is_overseas_customer
    );
}


function add_explode_bom_button(frm, cdt, cdn) {
    const row = frm.fields_dict.items.grid.get_row(cdn);

    if (!row || !row.grid_form) {
        console.error("BOM: Grid row or grid_form not found");
        return;
    }

    const description = row.grid_form.fields_dict.description;

    if (!description) {
        console.error("BOM: Description field not found");
        return;
    }

    // Remove existing BOM button
    description.$wrapper
        .find(".bom-custom-button")
        .remove();

    const label = description.$wrapper.find(".control-label");

    if (!label.length) {
        return;
    }

    const button_wrapper = $('<div class="bom-custom-button"></div>');

    label.append(button_wrapper);

    const button_control = frappe.ui.form.make_control({
        parent: button_wrapper,
        df: {
            fieldtype: "Button",
            fieldname: "explode_bom",
            label: __("Explode BOM"),
            click: function () {
                explode_bom(frm, cdt, cdn, button_control);
            }
        },
        render_input: true
    });

    button_control.refresh();

    button_wrapper.css({
        display: "inline-block",
        marginLeft: "12px",
    });

    button_wrapper.find("button").css({
        padding: "4px 8px",
        fontSize: "12px"
    });
}

async function explode_bom(frm, cdt, cdn, button_control) {
    const button = button_control.$input;

    if (!button || button.prop("disabled")) {
        return;
    }

    const item = locals[cdt][cdn];

    if (!item) {
        frappe.show_alert({
            message: __("Unable to find Item row."),
            indicator: "red"
        });

        return;
    }

    button.prop("disabled", true);

    const original_text = button.text();

    button.text(__("Fetching..."));

    try {
        if (!item.item_code) {
            throw new Error(__("Please select an Item first."));
        }

        const boms = await frappe.db.get_list("BOM", {
            filters: {
                item: item.item_code,
                docstatus: 1
            },
            fields: [
                "name",
                "item",
                "modified",
                "is_active"
            ],
            order_by: "modified desc",
            limit: 1
        });

        if (!boms || !boms.length) {
            frappe.show_alert({
                message: __(
                    "No submitted BOM found for Item {0}.",
                    [item.item_code]
                ),
                indicator: "orange"
            });

            return;
        }

        const bom_name = boms[0].name;

        const bom = await frappe.db.get_doc("BOM", bom_name);

        if (!bom.items || !bom.items.length) {
            frappe.show_alert({
                message: __(
                    "BOM {0} does not contain any components.",
                    [bom_name]
                ),
                indicator: "orange"
            });

            return;
        }

        const component_lines = bom.items
            .map((component, index) => {
                const item_name = (component.item_name || "").trim();
                const item_code = (component.item_code || "").trim();
                const qty = component.qty || 0;
                const uom = (component.uom || "").trim();

                let item_display;

                if (
                    item_name.toLowerCase() ===
                    item_code.toLowerCase()
                ) {
                    item_display = item_name;
                } else {
                    item_display = `${item_name} (${item_code})`;
                }

                return `${index + 1}) ${item_display} = ${qty} ${uom}`;
            })
            .filter(Boolean);

        if (!component_lines.length) {
            frappe.show_alert({
                message: __(
                    "No valid components found in BOM {0}.",
                    [bom_name]
                ),
                indicator: "orange"
            });

            return;
        }

        // Create description
        const component_html =
            "THIS ASSAY CONTAINING THE BELOW PARTS:<br>" +
            component_lines
                .map(line => frappe.utils.escape_html(line))
                .join("<br>");

        let existing_description = item.description || "";

        if (existing_description.trim()) {
            existing_description += "<br><br>";
        }

        existing_description += component_html;

        // Update Description

        await frappe.model.set_value(
            cdt,
            cdn,
            "description",
            existing_description
        );


        frm.refresh_field("items");

        frappe.show_alert({
            message: __(
                "BOM {0} components added to Description.",
                [bom_name]
            ),
            indicator: "green"
        });

    } catch (error) {
        console.error("BOM Error:", error);
        console.error("BOM Error Message:", error.message);
        console.error("BOM Error Stack:", error.stack);

        frappe.show_alert({
            message: error.message || __(
                "Unable to fetch or add BOM components."
            ),
            indicator: "red"
        });

    } finally {

        if (button && button.length) {
            button.prop("disabled", false);
            button.text(original_text);
        }
    }
}

frappe.ui.form.on("Sales Invoice Item", {
    form_render(frm, cdt, cdn) {
        add_explode_bom_button(frm, cdt, cdn);
    }
});


frappe.ui.form.on("Quotation Item", {
    form_render(frm, cdt, cdn) {
        add_explode_bom_button(frm, cdt, cdn);
    }
});
