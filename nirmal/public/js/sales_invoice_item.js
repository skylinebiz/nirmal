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