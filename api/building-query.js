import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '25mb', // Increased slightly for multiple maps/documents + auto PDF
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
        const { clientEmail, clientName, htmlBody, attachmentsList, proposalId } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and details are required' });
        }

        // 🎯 ট্র্যাকিং আইডি নিশ্চিত করা
        const trackingCode = proposalId || `CDC-INQ-${Math.floor(100000 + Math.random() * 900000)}`;

        // জোহো SMTP কনফিগারেশন (info@cdc-llc.net এর মাধ্যমে মেইল পাঠানোর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // 465 পোর্টের জন্য true
            auth: {
                user: process.env.INFO_EMAIL_USER, // info@cdc-llc.net
                pass: process.env.INFO_EMAIL_PASS  // জোহো থেকে জেনারেট করা info মেইলের App Password
            }
        });

        // Process user uploaded files and the auto-generated PDF receipt
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

        // 🚀 অটো-রিপ্লাই ও স্মার্ট রাউটিং নির্দেশিকা সহ বডি তৈরি
        const smartHtmlBody = `
            ${htmlBody}
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 30px 0 0 0; background-color: #f8f9fa; padding: 20px; border-left: 4px solid #0056b3; border-radius: 6px; text-align: left;">
                <p style="margin: 0; font-size: 14px; color: #555;">Inquiry Reference Code:</p>
                <p style="margin: 5px 0 15px 0; font-size: 18px; color: #0056b3; font-weight: bold; letter-spacing: 1px;">${trackingCode}</p>
                <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">
                    <strong>Important Instructions:</strong><br>
                    To provide additional files or updates regarding this inquiry, <strong>please reply directly to this email</strong> keeping the subject line intact. Your response will be routed directly to our <strong>INFO</strong> team.
                </p>
            </div>
        `;

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <info@cdc-llc.net>',
            replyTo: 'info@cdc-llc.net', // 👈 ক্লায়েন্ট রিপ্লাই দিলেই সোজা info@cdc-llc.net এ চলে যাবে
            to: clientEmail, // Client gets the inquiry confirmation
            bcc: 'joincdc@gmail.com', // 👈 আপনার এই জিমেইলে একটি কপি চলে যাবে
            subject: `[Tracking ID: ${trackingCode}] Project Inquiry Received - Civil Design & Construction LLC`,
            html: smartHtmlBody, // Beautifully formatted summary with tracking block
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Inquiry submitted, auto-reply sent successfully via Info!' });

    } catch (error) {
        console.error("Project Inquiry Email Error:", error);
        return res.status(500).json({ error: "Failed to process inquiry: " + error.message });
    }
}
