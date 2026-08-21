frappe.ui.form.on("Sales Invoice Item", {
    form_render(frm, cdt, cdn) {
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

        // Find Description label
        const label = description.$wrapper.find(".control-label");

        if (!label.length) {
            return;
        }

        const button = $(`
            <button
                type="button"
                class="btn btn-xs btn-default bom-custom-button"
                style="
                    margin-left: 12px;
                    padding: 4px 8px;
                    font-size: 12px;
                    vertical-align: middle;
                "
            >
                Explode BOM
            </button>
        `);

        button.on("click", async function (e) {
            e.preventDefault();
            e.stopPropagation();

            try {
                const item = locals[cdt][cdn];

                if (!item.item_code) {
                    console.warn("BOM: Item code is empty");

                    frappe.msgprint({
                        message: __("Please select an Item first."),
                        indicator: "orange"
                    });

                    return;
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
                    console.warn(
                        "BOM: No submitted BOM found for:",
                        item.item_code
                    );

                    frappe.msgprint({
                        title: __("BOM Not Found"),
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
                    console.warn(
                        "BOM: No components found in BOM:",
                        bom_name
                    );

                    frappe.msgprint({
                        title: __("No Components"),
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

                        if (item_name.toLowerCase() === item_code.toLowerCase()) {
                            item_display = item_name;
                        } else {
                            item_display = `${item_name} (${item_code})`;
                        }

                        const line = `${index + 1}) ${item_display} = ${qty} ${uom}`;

                        return line;
                    })
                    .filter(Boolean);

                if (!component_lines.length) {
                    console.warn("BOM: No valid component lines found");

                    frappe.msgprint({
                        title: __("No Components"),
                        message: __("No valid components found in BOM {0}.", [bom_name]),
                        indicator: "orange"
                    });

                    return;
                }

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

                frappe.model.set_value(
                    cdt,
                    cdn,
                    "description",
                    existing_description
                ).then(() => {
                    frm.refresh_field("items");
                    frappe.show_alert({
                        message: __(
                            "BOM {0} components added to Description.",
                            [bom_name]
                        ),
                        indicator: "green"
                    });
                });

            } catch (error) {
                console.error(
                    "BOM Error Message:",
                    error.message
                );

                console.error(
                    "BOM Error Stack:",
                    error.stack
                );

                frappe.msgprint({
                    title: __("BOM Error"),
                    message: __(
                        "Unable to fetch or add BOM components. Check the browser console for details."
                    ),
                    indicator: "red"
                });
            }
        });

        // Add BOM beside Description label
        label.append(button);
    }
});