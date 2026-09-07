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
        const { clientEmail, projectName, proposalId, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and message content are required' });
        }

        const senderEmail = process.env.INFO_EMAIL_USER || 'info@cdc-llc.net';

        // জোহো SMTP কনফিগারেশন (info@cdc-llc.net এর মাধ্যমে প্রপোজাল পাঠানোর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, 
            auth: {
                user: senderEmail, 
                pass: process.env.INFO_EMAIL_PASS  
            }
        });

        // Process attachments
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
            from: `"Civil Design & Construction LLC" <${senderEmail}>`,
            replyTo: 'support@cdc-llc.net', // 👈 ক্লায়েন্ট রিপ্লাই দিলে সোজা সাপোর্ট মেইলে যাবে
            to: clientEmail,
            // 👈 সিনট্যাক্স এরর ফিক্স করে সঠিক ফরম্যাটে সাবজেক্ট দেওয়া হলো
            subject: `Financial Proposal #${proposalId || 'General'} for ${projectName || 'Project'} - Civil Design & Construction LLC`,
            html: htmlBody,
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'BOQ Proposal Email sent successfully!' });

    } catch (error) {
        console.error("BOQ Email Error:", error);
        return res.status(500).json({ error: "Failed to send BOQ email: " + error.message });
    }
}
