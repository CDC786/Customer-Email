import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '25mb', // Increased for multiple maps/documents + auto PDF
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
        // ফ্রন্টএন্ড থেকে আসা ডেটা রিসিভ করা হচ্ছে
        const { 
            clientEmail, 
            clientName, 
            htmlBody, 
            attachmentsList, 
            department = 'service', // ডিফল্ট সার্ভিস ডিপার্টমেন্ট সেট করা হলো
            proposalId, 
            projectName, 
            projectLocation, 
            subjectLine 
        } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and details are required' });
        }

        // 🧠 ডিপার্টমেন্ট অনুযায়ী রিপ্লাই-টু এবং ট্র্যাকিং প্রিফিক্স নির্ধারণ
        let replyToEmail = 'service@cdc-llc.net';
        let trackingPrefix = 'SRV';

        const targetDept = department.toLowerCase();
        switch (targetDept) {
            case 'support':
                replyToEmail = 'support@cdc-llc.net';
                trackingPrefix = 'SUP';
                break;
            case 'payments':
            case 'payment':
                replyToEmail = 'payments@cdc-llc.net';
                trackingPrefix = 'PAY';
                break;
            case 'info':
                replyToEmail = 'info@cdc-llc.net';
                trackingPrefix = 'INQ';
                break;
            case 'service':
            default:
                replyToEmail = 'service@cdc-llc.net';
                trackingPrefix = 'SRV';
                break;
        }

        // 🎯 ট্র্যাকিং আইডি বা প্রপোজাল আইডি সেট করা
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = proposalId || `CDC-${trackingPrefix}-${randomNum}`;

        // 📝 সাবজেক্ট ফরম্যাট: [Tracking ID] + Subject / Proposal Details
        const defaultSubject = `Financial Proposal & BOQ${projectName ? ' - ' + projectName : ''}${projectLocation ? ' (' + projectLocation + ')' : ''}`;
        const coreSubject = subjectLine || defaultSubject;
        const finalSubject = `[Tracking ID: ${trackingCode}] ${coreSubject}`;

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

        // প্রসেস অ্যাটাচমেন্টস (PDF এবং অন্যান্য ফাইল)
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

        // 🚀 Smart Relay HTML: ফ্রন্টএন্ডের ফর্ম ডেটার নিচে ট্র্যাকিং ব্লক ও ইনস্ট্রাকশন অ্যাড করা
        const smartHtmlBody = `
            ${htmlBody}
            
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px 0 0 0; background-color: #f8f9fa; padding: 20px; border-left: 4px solid #0056b3; border-radius: 6px; text-align: left;">
                <p style="margin: 0; font-size: 14px; color: #555;">Your Request Tracking Code:</p>
                <p style="margin: 5px 0 15px 0; font-size: 18px; color: #0056b3; font-weight: bold; letter-spacing: 1px;">${trackingCode}</p>
                <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">
                    <strong>Important Instructions:</strong><br>
                    To provide additional updates or queries regarding this specific proposal, <strong>please reply directly to this email</strong> keeping the subject line intact. Your response will be routed directly to our <strong>SERVICE</strong> team.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"Civil Design & Construction LLC" <${process.env.GMAIL_USER || 'joincdc@gmail.com'}>`,
            replyTo: replyToEmail, // 👈 ক্লায়েন্ট রিপ্লাই দিলে সোজা service@cdc-llc.net এ চলে যাবে
            to: clientEmail, 
            subject: finalSubject,
            html: smartHtmlBody, 
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, trackingCode, message: 'Proposal emailed successfully via Service routing!' });

    } catch (error) {
        console.error("Proposal Email Error:", error);
        return res.status(500).json({ error: "Failed to process proposal email: " + error.message });
    }
}
