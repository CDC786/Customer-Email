import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // CORS Headers নিশ্চিত করা
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is required' });
        }

        // জিমেইল কনফিগারেশন পরীক্ষা করুন Vercel Environment Variables-এ GMAIL_USER ও GMAIL_PASS ঠিক আছে কি না
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // ফ্রন্টএন্ড বা ডেস্কটপ অ্যাপ থেকে আসা পিডিএফ এবং অন্যান্য ফাইলগুলো অ্যাটাচমেন্টে যুক্ত করা
        let finalAttachments = [];
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(att => {
                if (att && att.fileData) {
                    const base64Data = att.fileData.includes('base64,') ? att.fileData.split(';base64,').pop() : att.fileData;
                    finalAttachments.push({
                        filename: att.fileName || 'Invoice.pdf',
                        content: base64Data,
                        encoding: 'base64'
                    });
                }
            });
        }

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net', 
            to: clientEmail,
            bcc: process.env.GMAIL_USER, 
            subject: `Invoice (${invoiceNumber || 'CDC'}) - Civil Design & Construction LLC`,
            html: htmlBody || '<p>Please find your invoice attached.</p>',
            attachments: finalAttachments
        };

        await transporter.sendMail(mailOptions);

        // সফল হলে সবসময় সঠিক JSON রেসপন্স পাঠাবে
        return res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error("Backend Mail Error:", error);
        // সার্ভারে কোনো এরর ঘটলেও সেটি যেন টেক্সট না হয়ে JSON ফরম্যাটেই ক্লায়েন্টের কাছে যায়
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
