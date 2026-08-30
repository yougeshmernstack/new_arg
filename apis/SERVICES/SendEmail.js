const { errorLogger } = require("../utils/logger");
const mailerService = require("./mailerService");
const path = require("path");
const fs = require("fs");

class EMAIL {
    async sendWelcomeEmail(req, res) {
        const { email, name, username, password, role } = req.welcome || {};
        try {
            await this.sendWelcome({ email, name, username, password, role });
            return true;
        } catch (error) {
            errorLogger(error);
            return false;
        }
    }

    async sendWelcome({ email, name, username, password, role }) {
        if (!email) return { success: false, skipped: true };
        await mailerService.sendMail(
            email,
            "Welcome to Arogya Green Life",
            "welcome-email",
            { name, username, password, email, role: role || "member" }
        );
        return { success: true };
    }

    async sendOrderPlaced({ email, name, order, invoice }) {
        if (!email) return { success: false, skipped: true };
        const items = (order?.items || invoice?.items || []).map((i) => ({
            product_name: i.product_name || i.name,
            quantity: i.quantity || i.qty,
            total: i.total,
        }));
        await mailerService.sendMail(
            email,
            `Order placed — ${order?.order_number || order?.orderId || ""}`,
            "order-placed",
            {
                name: name || invoice?.customer_details?.name || "",
                order_number: order?.order_number,
                orderId: order?.orderId,
                items,
                total: order?.grand_total ?? invoice?.grand_total ?? 0,
                payment_status: order?.payment_status || invoice?.payment_status || "pending",
                shipping: order?.shipping_address || null,
            }
        );
        return { success: true };
    }

    async sendInvoiceEmail({ email, name, order, invoice }) {
        if (!email) return { success: false, skipped: true };
        const attachments = [];
        if (invoice?.pdf_path) {
            const abs = path.isAbsolute(invoice.pdf_path)
                ? invoice.pdf_path
                : path.join(__dirname, "..", invoice.pdf_path);
            if (fs.existsSync(abs)) {
                attachments.push({
                    filename: `${invoice.invoice_number || "invoice"}.html`,
                    path: abs,
                    contentType: "text/html",
                });
            }
        }
        const paidAt = order?.payment?.verified_at || order?.updatedAt || new Date();
        let paid_at = "";
        try {
            paid_at = new Date(paidAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        } catch (_) {
            paid_at = String(paidAt);
        }
        await mailerService.sendMail(
            email,
            `Invoice ${invoice?.invoice_number || ""} — Arogya Green Life`,
            "invoice-email",
            {
                name: name || invoice?.customer_details?.name || "",
                invoice_number: invoice?.invoice_number,
                orderId: order?.orderId || invoice?.orderId,
                order_number: order?.order_number || invoice?.order_number,
                total: invoice?.grand_total ?? order?.grand_total ?? 0,
                paid_at,
            },
            attachments
        );
        return { success: true };
    }
}

const Email = new EMAIL();
module.exports = Email;
