import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // CORS হেডার যুক্ত করা, যাতে যেকোনো ডোমেন থেকে ফর্ম সাবমিট করা যায়
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
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        // জোহো SMTP কনফিগারেশন (info@cdc-llc.net এর মাধ্যমে মেইল পাঠানোর জন্য)
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // 465 পোর্টের জন্য true
            auth: {
                user: process.env.INFO_EMAIL_USER, // info@cdc-llc.net
                pass: process.env.INFO_EMAIL_PASS  // জোহো থেকে জেনারেট করা info মেইলের App Password
            }
        });

        // মেইল অপশনস (info@cdc-llc.net থেকে নোটিফিকেশন যাবে এবং জিমেইলের কপি বাদ দেওয়া হয়েছে)
        const mailOptions = {
            from: '"CDC Website Query" <info@cdc-llc.net>',
            to: process.env.INFO_EMAIL_USER, // info@cdc-llc.net ইনবক্সে মূল নোটিফিকেশন আসবে
            // bcc పూర్తిగా বাদ দেওয়া হয়েছে
            replyTo: email, // ক্লায়েন্টের ইমেইল, যাতে ডাইরেক্ট রিপ্লাই দিতে পারেন
            subject: `New Quick Query from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #0056b3; margin-top: 0;">New Quick Query Received</h2>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Mobile Number:</strong> ${phone || 'Not provided'}</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold; color: #444;">Message:</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #555; white-space: pre-wrap;">${message}</p>
                    </div>

                    <p style="margin-top: 30px; font-size: 13px; color: #777;">
                        Civil Design & Construction LLC - Customer Query System | Web: https://www.cdc-llc.net
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Query sent successfully to Info!' });

    } catch (error) {
        console.error("Query Error:", error);
        return res.status(500).json({ error: "Failed to send query: " + error.message });
    } 
}
