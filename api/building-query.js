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

        // 🧠 সার্ভিস ডিপার্টমেন্টের জন্য কনফিগারেশন (ক্লায়েন্ট রিপ্লাই দিলে service@cdc-llc.net এ যাবে)
        const replyToEmail = 'service@cdc-llc.net';
        const trackingCode = proposalId || `CDC-SRV-${Math.floor(100000 + Math.random() * 900000)}`;

        // 🎯 আপনার চাওয়া ফরম্যাট অনুযায়ী সাবজেক্ট লাইন তৈরি করা
        const projNameStr = projectName ? ` - ${projectName}` : '';
        const finalSubject = `[Tracking ID: ${trackingCode}] Financial Proposal & BOQ${projNameStr}`;

        // 🚀 মাস্টার সেন্ডার: জিমেইল SMTP (joincdc@gmail.com থেকে মেইল যাবে)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, 
            auth: {
                user: process.env.GMAIL_USER, // joincdc@gmail.com
                pass: process.env.GMAIL_PASS  // Gmail App Password
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

        // 🚀 Smart Relay HTML: ফ্রন্টএন্ডের ফর্ম ডেটার নিচে ট্র্যাকিং ব্লক অ্যাড করা
        const smartHtmlBody = `
            ${htmlBody}
            
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 30px 0 0 0; background-color: #f8f9fa; padding: 20px; border-left: 4px solid #0056b3; border-radius: 6px; text-align: left;">
                <p style="margin: 0; font-size: 14px; color: #555;">Your Request Tracking ID:</p>
                <p style="margin: 5px 0 15px 0; font-size: 18px; color: #0056b3; font-weight: bold; letter-spacing: 1px;">${trackingCode}</p>
                <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">
                    <strong>Important Instructions:</strong><br>
                    To provide additional files or updates regarding this specific proposal, <strong>please reply directly to this email</strong> keeping the subject line unchanged. Your response will be routed directly to our <strong>SERVICE</strong> team.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"Civil Design & Construction LLC" <${process.env.GMAIL_USER || 'joincdc@gmail.com'}>`,
            replyTo: replyToEmail, // 👈 মেইল যাবে জিমেইল থেকে, কিন্তু ক্লায়েন্ট রিপ্লাই দিলে সোজা service@cdc-llc.net এ যাবে
            to: clientEmail, 
            subject: finalSubject,
            html: smartHtmlBody, 
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Proposal submitted and smart email sent successfully!' });

    } catch (error) {
        console.error("Proposal Email Error:", error);
        return res.status(500).json({ error: "Failed to process proposal: " + error.message });
    }
}
