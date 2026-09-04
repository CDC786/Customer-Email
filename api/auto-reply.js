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

    // অত্যন্ত গুরুত্বপূর্ণ: জোহো থেকে রিকোয়েস্ট আসছে কি না তা ট্র্যাক করার জন্য হিট লগ
    console.log("🔥 AUTO-REPLY API HIT", {
        method: req.method,
        time: new Date().toISOString(),
        body: req.body
    });

    try {
        const { clientEmail, department, senderName } = req.body || {};

        if (!clientEmail) {
            console.error("Error: Client email is missing in request body.");
            return res.status(400).json({ error: 'Client email is required' });
        }

        let extractedEmail = clientEmail;
        const emailMatch = clientEmail.match(/<(.+?)>/);
        if (emailMatch && emailMatch[1]) {
            extractedEmail = emailMatch[1];
        }

        console.log("Extracted Client Email:", extractedEmail);
        console.log("Target Department:", department);

        let emailUser, emailPass, emailSender, trackingPrefix;
        
        switch (department) {
            case 'payments':
                emailUser = process.env.PAYMENT_EMAIL_USER;
                emailPass = process.env.PAYMENT_EMAIL_PASS;
                emailSender = 'payments@cdc-llc.net';
                trackingPrefix = 'PAY';
                break;
            case 'support':
                emailUser = process.env.SUPPORT_EMAIL_USER;
                emailPass = process.env.SUPPORT_EMAIL_PASS;
                emailSender = 'support@cdc-llc.net';
                trackingPrefix = 'SUP';
                break;
            case 'info':
            default:
                emailUser = process.env.INFO_EMAIL_USER || process.env.GMAIL_USER;
                emailPass = process.env.INFO_EMAIL_PASS || process.env.GMAIL_PASS;
                emailSender = emailUser && emailUser.includes('@gmail.com') ? emailUser : 'info@cdc-llc.net';
                trackingPrefix = 'INQ';
                break;
        }

        // ইউনিক ট্র্যাকিং কোড জেনারেটর
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const trackingCode = `CDC-${trackingPrefix}-${randomNum}`;

        const mailProvider = process.env.MAIL_PROVIDER || 'zoho'; 
        
        let smtpConfig = {};
        if (mailProvider === 'gmail') {
            smtpConfig = {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true
            };
        } else {
            smtpConfig = {
                host: 'smtp.zoho.com',
                port: 465,
                secure: true
            };
        }

        const transporter = nodemailer.createTransport({
            ...smtpConfig,
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 35px; border-radius: 8px; border: 1px solid #dcdcdc; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    
                    <h2 style="color: #0056b3; margin-top: 0; text-align: center; font-size: 22px;">Civil Design & Construction LLC</h2>
                    <p style="text-align: center; color: #666; font-size: 13px; margin-top: -5px;">Sheridan, Wyoming | www.cdc-llc.net</p>
                    
                    <hr style="border: none; border-top: 2px solid #0056b3; margin: 20px 0;">
                    
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
                    
                    <p style="font-size: 13px; color: #666; line-height: 1.4; text-align: center; margin-bottom: 0;">
                        <strong>Civil Design & Construction LLC</strong><br>
                        USA WhatsApp: +1 (929) 237-1398 | BD: +880 1718-754948<br>
                        Website: <a href="https://www.cdc-llc.net" style="color: #0056b3; text-decoration: none;">www.cdc-llc.net</a>
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Civil Design & Construction LLC" <${emailSender}>`,
            replyTo: emailSender,
            to: extractedEmail,
            subject: `[Tracking ID: ${trackingCode}] Message Received - Civil Design & Construction LLC`,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email Sent Successfully. MessageId:", info.messageId);

        return res.status(200).json({ success: true, trackingCode, message: 'Auto-reply sent successfully!' });

    } catch (error) {
        console.error("Auto-Reply Critical Error:", error);
        return res.status(500).json({ error: "Failed to send auto-reply: " + error.message });
    }
}
