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
        // ফ্রন্টএন্ড থেকে htmlBody, subject এবং attachments রিসিভ করা
        const { clientEmail, subject, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Client email and message content are required' });
        }

        // জোহো SMTP কনফিগারেশন (payments@cdc-llc.net এর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // 465 পোর্টের জন্য true
            auth: {
                user: process.env.PAYMENT_EMAIL_USER, // payments@cdc-llc.net
                pass: process.env.PAYMENT_EMAIL_PASS  // জোহো থেকে জেনারেট করা পেমেন্ট মেইলের অ্যাপ পাসওয়ার্ড
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
            from: '"Civil Design & Construction LLC" <payments@cdc-llc.net>',
            replyTo: 'payments@cdc-llc.net', // 👈 ক্লায়েন্ট রিপ্লাই দিলে সোজা পেমেন্ট মেইলে আসবে
            to: clientEmail,
            // কোনো bcc রাখা হয়নি, তাই কোনো কপি কারও কাছে যাবে না—শুধু ক্লায়েন্ট পাবে
            subject: subject || 'Payment Update - Civil Design & Construction LLC',
            html: htmlBody, // Prepared beautifully from frontend
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Payment email sent successfully via Payments!' });

    } catch (error) {
        console.error("Payment Email Error:", error);
        return res.status(500).json({ error: "Failed to send payment email: " + error.message });
    }
}
