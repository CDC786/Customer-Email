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
        // ফ্রন্টএন্ড থেকে আসা projectLocation সহ সমস্ত ফিল্ড রিসিভ করা হচ্ছে
        const { clientEmail, projectName, projectLocation, proposalId, htmlBody, attachmentsList } = req.body || {};

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and htmlBody are required' });
        }

        const emailSender = 'service@cdc-llc.net';

        // প্রপোজাল আইডি নিশ্চিত করা
        const trackingCode = (proposalId && proposalId.trim() !== "") 
            ? proposalId.trim() 
            : `CDC-SRV-${Math.floor(100000 + Math.random() * 900000)}`;

        // সাবজেক্ট ফরম্যাট: [Tracking ID] Financial Proposal & BOQ - Project Name - Location
        const projNameStr = projectName ? ` - ${projectName.trim()}` : '';
        const locationStr = projectLocation ? ` - ${projectLocation.trim()}` : '';
        const finalSubject = `[${trackingCode}] Financial Proposal & BOQ${projNameStr}${locationStr}`;

        console.log("📌 Final Email Subject:", finalSubject);

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
            subject: finalSubject, // 👈 সাবজেক্টে এখন ট্র্যাকিং আইডি, প্রজেক্টের নাম ও লোকেশন পারফেক্টলি চলে যাবে
            html: htmlBody,
            attachments: mailAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Proposal sent successfully with full subject!' });

    } catch (error) {
        console.error("Proposal Email Critical Error:", error);
        return res.status(500).json({ error: "Failed to process proposal: " + error.message });
    }
}
