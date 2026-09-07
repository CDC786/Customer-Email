import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
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
        // 👈 এখানে subject রিসিভ করা হচ্ছে
        const { clientEmail, subject, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Missing client email or receipt data' });
        }

        const senderEmail = process.env.PAYMENT_EMAIL_USER || 'payment@cdc-llc.net';

        // জোহো SMTP কনফিগারেশন
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, 
            auth: {
                user: senderEmail, 
                pass: process.env.PAYMENT_EMAIL_PASS  
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
            // 👈 ফ্রন্টএন্ড থেকে পাঠানো সাবজেক্ট অথবা ডিফল্ট রিসিট সাবজেক্ট ব্যবহার করা হলো
            subject: subject || `Payment Receipt #${invoiceNumber || 'General'} from Civil Design & Construction LLC`,
            html: htmlBody,
            attachments: mailAttachments 
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Payment receipt sent successfully!' });

    } catch (error) {
        console.error("Payment Receipt Email Error:", error);
        return res.status(500).json({ error: "Failed to send payment receipt: " + error.message });
    }
}
