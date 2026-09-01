import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb', // Handles auto-generated PDF and attachments safely
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

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Missing client email or challan data' });
        }

        // ۱. ইমেইল পাঠানোর অংশ (আগের মতোই)
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

        // ২. টেলিগ্রামের মাধ্যমে ফাইল পাঠানোর অংশ (যদি অ্যাপ Telegram হয়)
        if (phoneData && phoneData.app === 'Telegram' && phoneData.mobileNumber) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = (phoneData.countryCode + phoneData.mobileNumber).replace(/\s+/g, '');

            const pdfAttachment = attachmentsList.find(att => att.fileName.includes('.pdf'));

            if (pdfAttachment) {
                const base64Data = pdfAttachment.fileData.split(';base64,').pop();
                const buffer = Buffer.from(base64Data, 'base64');

                // FormData ব্যবহার করে টেলিগ্রামে ফাইল পাঠানো
                const FormData = (await import('form-data')).default;
                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('document', buffer, { filename: pdfAttachment.fileName });
                formData.append('caption', `Hello! Here is your Delivery Challan #${invoiceNumber} from Civil Design & Construction LLC.`);

                const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                    method: 'POST',
                    body: formData,
                    headers: formData.headers
                });

                const tgResult = await tgResponse.json();
                if (!tgResult.ok) {
                    throw new Error(`Telegram API Error: ${tgResult.description}`);
                }
            }
        }

        return res.status(200).json({ success: true, message: 'Delivery Challan sent successfully via Email & Telegram!' });

    } catch (error) {
        console.error("Delivery Challan Error:", error);
        return res.status(500).json({ error: "Failed to send delivery challan: " + error.message });
    }
}
