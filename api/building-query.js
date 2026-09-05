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
        const { clientEmail, projectName, proposalId, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and details are required' });
        }

        // 🧠 সার্ভিস ডিপার্টমেন্টের কনফিগারেশন
        const emailSender = 'service@cdc-llc.net';
        const trackingPrefix = 'SRV';

        // 🎯 ট্র্যাকিং কোড জেনারেট বা রিসিভ করা
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = proposalId || `CDC-${trackingPrefix}-${randomNum}`;

        // 🔍 সাবজেক্ট লাইনে ট্র্যাকিং কোড বসানোর পারফেক্ট ফরম্যাট
        const projNameStr = projectName ? ` - ${projectName}` : '';
        const finalSubject = `[Tracking ID: ${trackingCode}] Financial Proposal & BOQ${projNameStr}`;

        // 🚀 জোহো SMTP কনফিগারেশন (service@cdc-llc.net এর মাধ্যমে পাঠানোর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SERVICE_EMAIL_USER, 
                pass: process.env.SERVICE_EMAIL_PASS  
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
            from: `"Civil Design & Construction LLC" <${emailSender}>`,
            replyTo: emailSender, // 👈 ক্লায়েন্ট রিপ্লাই দিলে সোজা সার্ভিস ইনবক্সে আসবে
            to: clientEmail,
            subject: finalSubject, // 👈 সাবজেক্টে ট্র্যাকিং কোড সহ ফাইনাল সাবজেক্ট
            html: htmlBody,
            attachments: mailAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Proposal Email Sent Successfully. MessageId:", info.messageId);

        return res.status(200).json({ success: true, trackingCode, message: 'Proposal and tracking email sent successfully!' });

    } catch (error) {
        console.error("Proposal Email Critical Error:", error);
        return res.status(500).json({ error: "Failed to send proposal: " + error.message });
    }
}
