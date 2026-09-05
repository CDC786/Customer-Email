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
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Missing client email or challan data' });
        }

        // জোহো SMTP কনফিগারেশন (service@cdc-llc.net এর মাধ্যমে চালান পাঠানোর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // 465 পোর্টের জন্য true
            auth: {
                user: process.env.SERVICE_EMAIL_USER, // service@cdc-llc.net
                pass: process.env.SERVICE_EMAIL_PASS  // জোহো থেকে জেনারেট করা সার্ভিস মেইলের অ্যাপ পাসওয়ার্ড
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
            from: '"Civil Design & Construction LLC" <service@cdc-llc.net>',
            replyTo: 'service@cdc-llc.net', // 👈 ক্লায়েন্ট রিপ্লাই দিলে সোজা সার্ভিস মেইলে যাবে
            to: clientEmail,
            // কোনো bcc রাখা হয়নি, তাই কোনো কপি কারও কাছে যাবে না—শুধু ক্লায়েন্ট পাবে
            subject: `Delivery Challan #${invoiceNumber} from Civil Design & Construction LLC`,
            html: htmlBody,
            attachments: mailAttachments // Contains user files + the Auto-generated PDF Challan
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Delivery Challan sent successfully via Service Email!' });

    } catch (error) {
        console.error("Delivery Challan Email Error:", error);
        return res.status(500).json({ error: "Failed to send delivery challan: " + error.message });
    }
}
