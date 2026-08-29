import nodemailer from 'nodemailer';

// বড় ফাইল বা অ্যাটাচমেন্ট হ্যান্ডেল করার জন্য বডি সাইজ লিমিট বাড়িয়ে দেওয়া হলো
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
        const { clientEmail, subject, fileLink, fileData, fileName } = req.body;

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

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            to: clientEmail,
            subject: subject || 'Payment Successful - Your Civil Design & Construction LLC Service & Download Link',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #0056b3; margin-top: 0;">Civil Design & Construction LLC</h2>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                    <p>Dear Valued Client,</p>
                    <p>Thank you for your payment! We have successfully received your transaction for our engineering/digital services.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold; color: #444;">Order Summary:</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Status: <span style="color: green; font-weight: bold;">Confirmed & Paid</span></p>
                    </div>

                    <p>You can access your purchased files, design documents, or download links by clicking the button below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${fileLink || 'https://www.cdc-llc.net'}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Access Your Files / Services</a>
                    </div>

                    <p>If you have any questions or require further assistance, simply reply directly to this email or contact us at <strong>joincdc@gmail.com</strong>.</p>

                    <p style="margin-top: 30px; font-size: 13px; color: #777;">
                        Best regards,<br>
                        <strong>Civil Design & Construction LLC</strong><br>
                        <i>Sheridan, Wyoming</i>
                    </p>
                </div>
            `,
            attachments: fileData && fileName ? [{
                filename: fileName,
                content: fileData.split(',')[1],
                encoding: 'base64'
            }] : []
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error("Manual Email Error:", error);
        return res.status(500).json({ error: "Failed to send email: " + error.message });
    }
}
