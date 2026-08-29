import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    try {
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail) { 
            return res.status(400).json({ error: 'Client email is required' }); 
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // যদি ফ্রন্টএন্ড থেকে কোনো কারণে htmlBody খালি আসে, তবে সার্ভার নিজেই একটি সুন্দর ইনভয়েস বডি বানিয়ে নেবে
        const fallbackHtml = `
            <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
                <h2 style="color: #0056b3; margin-top: 0;">Civil Design & Construction LLC</h2>
                <p>Hello,</p>
                <p>You have received a new invoice from <strong>Civil Design & Construction LLC</strong>.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0056b3;">
                    <p style="margin: 0;"><strong>Invoice Number:</strong> ${invoiceNumber || 'CDC-INV'}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Pending Payment / Due Upon Receipt</p>
                </div>
                <p>Please check the attached PDF document for complete breakdown of service items, milestones, and payment instructions.</p>
                <p style="margin-top: 25px; font-size: 13px; color: #777;">Best regards,<br><strong>Civil Design & Construction LLC</strong><br>Sheridan, Wyoming</p>
            </div>
        `;

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
            html: (htmlBody && htmlBody.length > 50) ? htmlBody : fallbackHtml,
            attachments: finalAttachments
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error("Mail error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
