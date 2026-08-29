import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '15mb',
        },
    },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { 
            clientName, clientEmail, clientPhone, currency, invoiceNumber, paymentTerms, 
            items, attachmentsList, paymentButtonHtml, bankDetailsHtml
        } = req.body;

        if (!clientEmail || !clientName) {
            return res.status(400).json({ error: 'Client name and email are required' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // হিসাব এবং আইটেম টেবিল তৈরি
        let totalAmount = 0;
        let itemsHtml = '';
        const curr = currency || '$';

        if (items && Array.isArray(items)) {
            items.forEach(item => {
                const amount = item.qty * item.rate;
                totalAmount += amount;
                if (item.desc) {
                    itemsHtml += `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.desc}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${item.qty}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center;">${item.unit || ''}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right;">${curr}${item.rate.toFixed(2)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${curr}${amount.toFixed(2)}</td>
                        </tr>
                    `;
                }
            });
        }

        // একাধিক অ্যাটাচমেন্ট প্রসেসিং
        let mailAttachments = [];
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(file => {
                if (file.fileData && file.fileName) {
                    mailAttachments.push({
                        filename: file.fileName,
                        content: file.fileData.split(',')[1],
                        encoding: 'base64'
                    });
                }
            });
        }

        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            to: clientEmail,
            subject: `Invoice #${invoiceNumber} from Civil Design & Construction LLC`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 750px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 8px; background: #fff;">
                    
                    <!-- Header -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td>
                                <h2 style="color: #0056b3; margin: 0;">Civil Design & Construction LLC</h2>
                                <p style="font-size: 13px; color: #555; margin: 5px 0 0 0;">
                                    USA: +1 (929) 237-1398 | BD: +880 1718-754948<br>
                                    Email: joincdc@gmail.com | Web: https://cdc-llc.net
                                </p>
                            </td>
                            <td style="text-align: right; vertical-align: top;">
                                <h1 style="color: #0056b3; margin: 0; font-size: 28px;">INVOICE</h1>
                                <p style="font-size: 13px; color: #555; margin: 5px 0 0 0;">
                                    <strong>Invoice Number:</strong> ${invoiceNumber}<br>
                                    <strong>Invoice Date:</strong> ${currentDate}<br>
                                    <strong>Payment Terms:</strong> ${paymentTerms || 'Due Upon Receipt'}
                                </p>
                            </td>
                        </tr>
                    </table>

                    <hr style="border: none; border-top: 2px solid #0056b3; margin: 20px 0;">

                    <!-- Billed To -->
                    <div style="margin-bottom: 25px; background: #f9f9f9; padding: 15px; border-radius: 6px;">
                        <p style="margin: 0 0 5px 0; font-size: 13px; color: #777; font-weight: bold;">BILLED TO:</p>
                        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #222;">${clientName}</p>
                        <p style="margin: 3px 0 0 0; font-size: 14px; color: #555;">${clientEmail}</p>
                        ${clientPhone ? `<p style="margin: 3px 0 0 0; font-size: 14px; color: #555;">Phone / WhatsApp: ${clientPhone}</p>` : ''}
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #0056b3; color: white;">
                                <th style="padding: 12px; text-align: left;">Description</th>
                                <th style="padding: 12px; text-align: center;">Quantity</th>
                                <th style="padding: 12px; text-align: center;">Unit</th>
                                <th style="padding: 12px; text-align: right;">Rate</th>
                                <th style="padding: 12px; text-align: right;">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <!-- Grand Total Due -->
                    <div style="text-align: right; margin-bottom: 25px;">
                        <div style="font-size: 18px; font-weight: bold; color: #222; background: #f1f1f1; display: inline-block; padding: 12px 25px; border-radius: 5px; border: 1px solid #ddd;">
                            Grand Total Due: <span style="color: #0056b3;">${curr}${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- Payment Buttons from Frontend -->
                    ${paymentButtonHtml || ''}

                    <!-- Bank Details from Frontend -->
                    ${bankDetailsHtml || ''}

                    <div style="background-color: #fcf8e3; padding: 15px; border-radius: 6px; border: 1px solid #faebcc; font-size: 13px; color: #8a6d3b; margin-bottom: 20px;">
                        <strong>Payment Instructions & Important Note:</strong><br>
                        1. Please include your Invoice Number (${invoiceNumber}) in the payment reference.<br>
                        2. You can pay using the secure buttons above or via bank wire/transfer using the details provided.
                    </div>

                    <div style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 15px;">
                        <strong>Terms & Conditions:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 15px;">
                            <li>Agreement Requirement: Payment confirms mutual agreement on project scope and deliverables.</li>
                            <li>No Refund Policy: All sales are final once project deliverables are handed over.</li>
                            <li>Secure Processing: All transactions are processed under Civil Design & Construction LLC.</li>
                        </ul>
                    </div>

                    <p style="margin-top: 30px; font-size: 13px; color: #777; text-align: center;">
                        Thank you for your business!<br>
                        <strong>Civil Design & Construction LLC</strong> | <i>Sheridan, Wyoming</i>
                    </p>
                </div>
            `,
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Invoice sent successfully!' });

    } catch (error) {
        console.error("Invoice Email Error:", error);
        return res.status(500).json({ error: "Failed to send invoice: " + error.message });
    }
}
