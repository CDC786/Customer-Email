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
        // ফ্রন্টএন্ড থেকে ডেটার সাথে department রিসিভ করা হচ্ছে (না থাকলে ডিফল্ট 'info' ধরবে)
        const { clientEmail, clientName, htmlBody, attachmentsList, department = 'info', subjectLine } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and details are required' });
        }

        let replyToEmail, trackingPrefix;

        // 🧠 ডাইনামিক ডিপার্টমেন্ট রাউটিং (ক্লায়েন্ট রিপ্লাই দিলে কোথায় যাবে)
        const targetDept = department.toLowerCase();
        switch (targetDept) {
            case 'service':
                replyToEmail = 'service@cdc-llc.net';
                trackingPrefix = 'SRV';
                break;
            case 'payments':
            case 'payment':
                replyToEmail = 'payments@cdc-llc.net';
                trackingPrefix = 'PAY';
                break;
            case 'support':
                replyToEmail = 'support@cdc-llc.net';
                trackingPrefix = 'SUP';
                break;
            case 'info':
            default:
                replyToEmail = 'info@cdc-llc.net';
                trackingPrefix = 'INQ';
                break;
        }

        // 🎯 জেনারেট ট্র্যাকিং আইডি
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = `CDC-${trackingPrefix}-${randomNum}`;
        const finalSubject = subjectLine 
            ? `[Tracking ID: ${trackingCode}] ${subjectLine}` 
            : `[Tracking ID: ${trackingCode}] Project Inquiry Received - Civil Design & Construction LLC`;

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

        // 🚀 Smart Relay HTML: ফ্রন্টএন্ডের ফর্ম ডেটার নিচে ট্র্যাকিং ব্লক অ্যাড করা
        const smartHtmlBody = `
            ${htmlBody}
            
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px 0 0 0; background-color: #f8f9fa; padding: 20px; border-left: 4px solid #0056b3; border-radius: 6px; text-align: left;">
                <p style="margin: 0; font-size: 14px; color: #555;">Your Request Tracking Code:</p>
                <p style="margin: 5px 0 15px 0; font-size: 18px; color: #0056b3; font-weight: bold; letter-spacing: 1px;">${trackingCode}</p>
                <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">
                    <strong>Important Instructions:</strong><br>
                    To provide additional files or updates regarding this specific request, <strong>please reply directly to this email</strong> keeping the subject line unchanged. Your response will be routed directly to our <strong>${targetDept.toUpperCase()}</strong> team.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"Civil Design & Construction LLC" <${process.env.GMAIL_USER || 'joincdc@gmail.com'}>`,
            replyTo: replyToEmail, // 👈 জাদুটা এখানে: মেইল যাবে জিমেইল থেকে, কিন্তু রিপ্লাই আসবে জোহোতে
            to: clientEmail, 
            // bcc: 'joincdc@gmail.com' // এটি কমেন্ট আউট করে দিলাম কারণ জিমেইল থেকে গেলে সেন্ট (Sent) বক্সে এমনিতেই সেভ থাকবে।
            subject: finalSubject,
            html: smartHtmlBody, 
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Inquiry submitted and smart email sent successfully!' });

    } catch (error) {
        console.error("Project Inquiry Email Error:", error);
        return res.status(500).json({ error: "Failed to process inquiry: " + error.message });
    }
}
