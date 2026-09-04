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
        const { clientEmail, clientName, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and details are required' });
        }

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

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <info@cdc-llc.net>',
            replyTo: 'support@cdc-llc.net',
            to: clientEmail, // Client gets the inquiry confirmation
            // bcc বা অন্য কোনো অতিরিক্ত কপি বাদ দেওয়া হয়েছে (Sent বক্সে পাওয়া যাবে)
            subject: `Project Inquiry Received - Civil Design & Construction LLC`,
            html: htmlBody, // Beautifully formatted summary from frontend
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Inquiry submitted and emailed successfully!' });

    } catch (error) {
        console.error("Project Inquiry Email Error:", error);
        return res.status(500).json({ error: "Failed to process inquiry: " + error.message });
    }
}
