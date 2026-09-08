import nodemailer from 'nodemailer';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
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
        const { clientEmail, department, senderName, clientMessageId, clientSubject } = req.body || {};

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is required' });
        }

        let extractedEmail = clientEmail;
        const emailMatch = clientEmail.match(/<(.+?)>/);
        if (emailMatch && emailMatch[1]) {
            extractedEmail = emailMatch[1];
        }

        let emailUser, emailPass, emailSender, trackingPrefix, smtpHost;
        
        switch (department) {
            case 'service':
                emailUser = process.env.SERVICE_EMAIL_USER;
                emailPass = process.env.SERVICE_EMAIL_PASS;
                emailSender = 'service@cdc-llc.net';
                trackingPrefix = 'SRV';
                smtpHost = 'smtp.zoho.com';
                break;
            case 'payments':
                emailUser = process.env.PAYMENT_EMAIL_USER;
                emailPass = process.env.PAYMENT_EMAIL_PASS;
                emailSender = 'payments@cdc-llc.net';
                trackingPrefix = 'PAY';
                smtpHost = 'smtp.zoho.com';
                break;
            case 'support':
                emailUser = process.env.SUPPORT_EMAIL_USER;
                emailPass = process.env.SUPPORT_EMAIL_PASS;
                emailSender = 'support@cdc-llc.net';
                trackingPrefix = 'SUP';
                smtpHost = 'smtp.zoho.com';
                break;
            case 'info':
                emailUser = process.env.INFO_EMAIL_USER;
                emailPass = process.env.INFO_EMAIL_PASS;
                emailSender = 'info@cdc-llc.net';
                trackingPrefix = 'INQ';
                smtpHost = 'smtp.zoho.com';
                break;
            case 'joincdc':
            case 'gmail':
            default:
                emailUser = process.env.GMAIL_USER;
                emailPass = process.env.GMAIL_PASS;
                emailSender = process.env.GMAIL_USER || 'joincdc@gmail.com';
                trackingPrefix = 'JNC';
                smtpHost = 'smtp.gmail.com';
                break;
        }

        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = `CDC-${trackingPrefix}-${randomNum}`;

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 465,
            secure: true,
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px 10px; text-align: left;">
                <div style="max-width: 600px; margin: 0; background: #ffffff; padding: 35px; border-radius: 8px; border: 1px solid #dcdcdc; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: left;">
                    
                    <p style="color: #333; font-size: 15px;">Dear ${senderName || 'Valued Client'},</p>
                    <p style="color: #444; font-size: 14px; line-height: 1.5;">
                        Thank you for reaching out to us. We have successfully received your message and opened a support/inquiry ticket for your request.
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 18px; border-left: 4px solid #0056b3; border-radius: 6px; margin: 25px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">Your Tracking / Reference Code:</p>
                        <p style="margin: 5px 0 0 0; font-size: 18px; color: #0056b3; font-weight: bold; letter-spacing: 1px;">${trackingCode}</p>
                    </div>

                    <p style="color: #444; font-size: 14px; line-height: 1.5;">
                        <strong>Important Instructions:</strong><br>
                        For any further updates, replies, or additional queries regarding this case, <strong>please do not create a new email</strong>. Simply reply directly to this email keeping this reference code intact. 
                    </p>

                    <p style="color: #444; font-size: 14px; line-height: 1.5;">
                        One of our representatives will review your case and get back to you within <strong>24 hours</strong>.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                    
                    <p style="font-size: 13px; color: #666; line-height: 1.4; text-align: left; margin-bottom: 0;">
                        <strong>Civil Design & Construction LLC</strong><br>
                        USA WhatsApp: +1 (929) 237-1398 | BD: +880 1718-754948<br>
                        Website: <a href="https://www.cdc-llc.net" style="color: #0056b3; text-decoration: none;">www.cdc-llc.net</a>
                    </p>
                </div>
            </div>
        `;

        // সাবজেক্ট থেকে ট্র্যাকিং কোড সম্পূর্ণ বাদ দেওয়া হলো। শুধু ক্লায়েন্টের সাবজেক্ট বা Re: রাখা হলো।
        let replySubject = 'Message Received - Civil Design & Construction LLC';
        if (clientSubject) {
            const cleanSub = clientSubject.replace(/^Re:\s*/i, ''); // আগের Re থাকলে তা পরিষ্কার করে নেওয়া
            replySubject = `Re: ${cleanSub}`;
        }

        const mailOptions = {
            from: `"Civil Design & Construction LLC" <${emailSender}>`,
            replyTo: emailSender,
            to: extractedEmail,
            subject: replySubject,
            html: htmlBody,
            ...(clientMessageId && {
                headers: {
                    'In-Reply-To': clientMessageId,
                    'References': clientMessageId
                }
            })
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email Sent Successfully. MessageId:", info.messageId);

        return res.status(200).json({ success: true, trackingCode, message: 'Auto-reply sent successfully!' });

    } catch (error) {
        console.error("Auto-Reply Critical Error:", error);
        return res.status(500).json({ error: "Failed to send auto-reply: " + error.message });
    }
}
