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
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList, phoneData } = req.body;

        // ১. যদি রিকোয়েস্টটি শুধু মেসেজিং অ্যাপের (Telegram) জন্য হয়, তবে শুধু টেলিগ্রামে পাঠাবে (মেইলে যাবে না)
        if (phoneData && phoneData.app === 'Telegram' && phoneData.mobileNumber) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = (phoneData.countryCode + phoneData.mobileNumber).replace(/\s+/g, '');

            const pdfAttachment = attachmentsList ? attachmentsList.find(att => att.fileName.includes('.pdf')) : null;

            if (!pdfAttachment) {
                return res.status(400).json({ error: 'PDF attachment missing for Telegram' });
            }

            const base64Data = pdfAttachment.fileData.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');

            // Vercel-এর বিল্ট-ইন Blob এবং FormData ব্যবহার করা (কোনো এক্সট্রা প্যাকেজ লাগবে না)
            const blob = new Blob([buffer], { type: 'application/pdf' });
            const formData = new globalThis.FormData();
            formData.append('chat_id', chatId);
            formData.append('document', blob, pdfAttachment.fileName);
            formData.append('caption', `Hello! Here is your Delivery Challan #${invoiceNumber} from Civil Design & Construction LLC.`);

            const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            const tgResult = await tgResponse.json();
            if (!tgResult.ok) {
                throw new Error(`Telegram API Error: ${tgResult.description}`);
            }

            return res.status(200).json({ success: true, message: 'Challan sent successfully via Telegram!' });
        }

        // ২. সাধারণ ইমেইল পাঠানোর অংশ (এখানে শুধু মেইল যাবে)
        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Missing client email or challan data' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
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
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net',
            to: clientEmail,
            bcc: process.env.GMAIL_USER,
            subject: `Delivery Challan #${invoiceNumber} from Civil Design & Construction LLC`,
            html: htmlBody,
            attachments: mailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Delivery Challan sent successfully via Email!' });

    } catch (error) {
        console.error("Delivery Challan Error:", error);
        return res.status(500).json({ error: "Failed to send delivery challan: " + error.message });
    }
}
