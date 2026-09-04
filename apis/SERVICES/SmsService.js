const axios = require('axios').default;
const authkey = process.env.MSG91_AUTHKEY;

class SMS {
    formatMobile(mobile) {
        const cleaned = String(mobile).replace(/\D/g, '');
        if (cleaned.length === 10) return `91${cleaned}`;
        return cleaned;
    }

    /** DD-MM-YY for MSG91 invoice template */
    formatDate(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);
        return [
            String(d.getDate()).padStart(2, '0'),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getFullYear()).slice(-2)
        ].join('-');
    }

    async sendFlow(templateId, recipients) {
        try {
            const { data } = await axios.request({
                method: 'POST',
                url: 'https://control.msg91.com/api/v5/flow',
                headers: {
                    accept: 'application/json',
                    authkey,
                    'content-type': 'application/json'
                },
                data: {
                    template_id: templateId,
                    recipients
                }
            });
            return data;
        } catch (error) {
            console.error('SMS Error:', error?.response?.data || error.message);
            throw error;
        }
    }

    // var1 = invoice/order id, var2 = date
    async invoiceSms(mobile, invoiceId, date) {
        return this.sendFlow('6a98207662fe4d70e801fe13', [{
            mobiles: this.formatMobile(mobile),
            var1: String(invoiceId),
            var2: String(date)
        }]);
    }

    // var1 = name, var2 = amount, var3 = order/ref id
    async paymentSms(mobile, name, amount, orderId) {
        return this.sendFlow('6a981f389abc7f2b9e02a8d2', [{
            mobiles: this.formatMobile(mobile),
            var1: String(name),
            var2: String(amount),
            var3: String(orderId)
        }]);
    }

    // var1 = username, var2 = password / sponsor id
    async usernameSms(mobile, username, password) {
        return this.sendFlow('6a981dff25f31a7028073652', [{
            mobiles: this.formatMobile(mobile),
            var1: String(username),
            var2: String(password)
        }]);
    }

    async orderSms(mobile, ...vars) {
        // Add template_id and var mapping when MSG91 order template is ready
    }
}

const sms = new SMS();
module.exports = sms;
