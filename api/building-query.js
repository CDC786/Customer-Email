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

    console.log("🔥 BOQ API HIT", {
        method: req.method,
        time: new Date().toISOString(),
        body: req.body
    });

    try {
        const { clientEmail, projectName, proposalId, htmlBody, attachmentsList } = req.body || {};

        if (!clientEmail || !htmlBody) {
            console.error("Error: Client email or htmlBody is missing.");
            return res.status(400).json({ error: 'Client email and htmlBody are required' });
        }

        let extractedEmail = clientEmail;
        const emailMatch = clientEmail.match(/<(.+?)>/);
        if (emailMatch && emailMatch[1]) {
            extractedEmail = emailMatch[1];
        }

        // 🧠 সার্ভিস ডিপার্টমেন্ট কনফিগারেশন (ক্লায়েন্ট রিপ্লাই দিলে service@cdc-llc.net এ যাবে)
        const emailSender = 'service@cdc-llc.net';
        const trackingPrefix = 'SRV';

        // 🎯 ট্র্যাকিং কোড নিশ্চিত করা
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = proposalId || `CDC-${trackingPrefix}-${randomNum}`;

        // 🔍 সাবজেক্ট লাইনে ট্র্যাকিং কোড বসানোর ফিক্সড ফরম্যাট: [Tracking ID: ...] Financial Proposal & BOQ - Project Name
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
            to: extractedEmail,
            subject: finalSubject, // 👈 সাবজেক্টে এখন নিশ্চিতভাবে ট্র্যাকিং কোড সহ চলে যাবে
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
