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

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
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
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net',
            to: clientEmail, // Client gets the receipt
            bcc: process.env.GMAIL_USER, // Admin (You) gets the exact copy with all attachments
            subject: `Project Inquiry Received - Civil Design & Construction LLC`,
            html: htmlBody, // Beautifully formatted receipt from frontend
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Inquiry submitted and emailed successfully!' });

    } catch (error) {
        console.error("Project Inquiry Email Error:", error);
        return res.status(500).json({ error: "Failed to process inquiry: " + error.message });
    }
}
