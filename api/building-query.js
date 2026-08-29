import nodemailer from 'nodemailer';

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
        const { 
            name, email, phone, 
            landWidth, landLength, landArea, 
            stories, buildingType, budget, message,
            fileData, fileName 
        } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // ইমেইল অপশন ও অ্যাটাচমেন্ট কনফিগারেশন
        const mailOptions = {
            from: '"CDC Building Query" <joincdc@gmail.com>',
            to: process.env.GMAIL_USER,
            replyTo: email,
            subject: `New Building Design Inquiry from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #0056b3; margin-top: 0;">New Construction & Design Inquiry</h2>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                    <h3 style="color: #444; border-bottom: 2px solid #0056b3; padding-bottom: 5px;">Client Information</h3>
                    <p style="font-size: 15px;"><strong>Name:</strong> ${name}</p>
                    <p style="font-size: 15px;"><strong>Email:</strong> ${email}</p>
                    <p style="font-size: 15px;"><strong>Mobile Number:</strong> ${phone}</p>

                    <h3 style="color: #444; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 20px;">Land & Building Specifications</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 15px;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Land/Building Width:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${landWidth || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Land/Building Length:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${landLength || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Total Land Area:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${landArea || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Number of Stories:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: #0056b3; font-weight: bold;">${stories || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Building Type:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${buildingType || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Estimated Budget:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${budget || 'N/A'}</td>
                        </tr>
                    </table>

                    <h3 style="color: #444; margin-top: 20px;">Additional Notes / Requirements:</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #0056b3;">
                        <p style="margin: 0; font-size: 15px; color: #555; white-space: pre-wrap;">${message || 'No additional notes provided.'}</p>
                    </div>

                    <p style="margin-top: 30px; font-size: 13px; color: #777;">
                        Civil Design & Construction LLC - Automated Query System
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
        return res.status(200).json({ success: true, message: 'Query sent successfully!' });

    } catch (error) {
        console.error("Building Query Error:", error);
        return res.status(500).json({ error: "Failed to send query" });
    }
}