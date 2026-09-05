import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '25mb',
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
        const { clientEmail, projectName, proposalId, htmlBody, attachmentsList } = req.body || {};

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and htmlBody are required' });
        }

        const emailSender = 'service@cdc-llc.net';

        // 🎯 ফ্রন্টএন্ড থেকে আসা Proposal ID-কে শতভাগ গুরুত্ব দেওয়া
        const trackingCode = proposalId || `CDC-SRV-${Math.floor(100000 + Math.random() * 900000)}`;

        // 🔍 সাবজেক্টের একদম শুরুতে ট্র্যাকিং আইডি বসানোর লজিক
        const projNameStr = projectName ? ` - ${projectName}` : '';
        const finalSubject = `[Tracking ID: ${trackingCode}] Financial Proposal & BOQ${projNameStr}`;

        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SERVICE_EMAIL_USER, 
                pass: process.env.SERVICE_EMAIL_PASS  
            }
        });

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
            from: `"Civil Design & Construction LLC" <${emailSender}>`,
            replyTo: emailSender,
            to: clientEmail,
            subject: finalSubject, // 👈 সাবজেক্টের সামনে ট্র্যাকিং কোড নিশ্চিত করা হলো
            html: htmlBody,
            attachments: mailAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Proposal sent successfully!' });

    } catch (error) {
        console.error("Proposal Email Critical Error:", error);
        return res.status(500).json({ error: "Failed to send proposal: " + error.message });
    }
}
