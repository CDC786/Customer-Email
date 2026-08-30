import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
        },
    },
};

export default async function handler(req, res) {
    // CORS headers for allowing requests from your frontend
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
        // Receiving data from the BOQ frontend form
        const { clientEmail, projectName, htmlBody, attachmentsList } = req.body;

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

        // Process attachments (Including the auto-generated BOQ Proposal PDF)
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

        // Email configurations
        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net', 
            to: clientEmail,
            bcc: process.env.GMAIL_USER, // Sends a copy to your admin email
            subject: `Financial Proposal & BOQ - ${projectName || 'Civil Design & Construction LLC'}`,
            html: htmlBody, // The beautifully formatted HTML sent from the frontend
            attachments: mailAttachments
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'BOQ Proposal Email sent successfully!' });

    } catch (error) {
        console.error("BOQ Email Error:", error);
        return res.status(500).json({ error: "Failed to send BOQ email: " + error.message });
    }
}
