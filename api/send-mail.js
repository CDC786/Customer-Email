import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
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
        // Now receiving htmlBody directly from frontend just like the invoice API
        const { clientEmail, subject, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and message content are required' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // Process attachments (including auto-generated PDF)
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
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net', // Client replies will go to support
            to: clientEmail,
            bcc: process.env.GMAIL_USER, // Sends an exact copy of the mail & PDF to your admin email
            subject: subject || 'Delivery - Civil Design & Construction LLC',
            html: htmlBody, // Prepared beautifully from frontend
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error("Manual Email Error:", error);
        return res.status(500).json({ error: "Failed to send email: " + error.message });
    }
}
