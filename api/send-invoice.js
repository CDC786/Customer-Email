import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb', // Increased slightly to handle auto-generated PDF safely
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
        // Receives the fully generated HTML Body and attachments (including PDF) from frontend
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail || !htmlBody) {
            return res.status(400).json({ error: 'Missing client email or invoice data' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
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
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>', // Main authenticated sender
            replyTo: 'support@cdc-llc.net', // Replies will go here
            to: clientEmail,
            bcc: process.env.GMAIL_USER, // Sends an exact copy of the invoice to your admin email
            subject: `Invoice #${invoiceNumber} from Civil Design & Construction LLC`,
            html: htmlBody,
            attachments: mailAttachments // Contains user files + the Auto-generated PDF
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Invoice sent successfully!' });

    } catch (error) {
        console.error("Invoice Email Error:", error);
        return res.status(500).json({ error: "Failed to send invoice: " + error.message });
    }
}
