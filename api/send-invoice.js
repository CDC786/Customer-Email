import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

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

        // সার্ভার নিজেই একদম পারফেক্ট পিডিএফ জেনারেট করবে (কখনও খালি হবে না)
        const generateServerPDF = () => {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
                doc.on('error', reject);

                // PDF ডিজাইন ও কন্টেন্ট
                doc.fontSize(20).fillColor('#0056b3').text('Civil Design & Construction LLC', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(13).fillColor('#444').text(`INVOICE: ${invoiceNumber || 'CDC-INV'}`, { align: 'center' });
                doc.moveDown(1.2);
                
                doc.fontSize(10).fillColor('#333').text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                doc.text(`Billed To: ${clientEmail}`);
                doc.moveDown(1.2);

                doc.fontSize(12).fillColor('#0056b3').text('Invoice Summary & Payment Details:');
                doc.fontSize(10).fillColor('#555').text('Thank you for your business. Please review the service items, milestones, and payment instructions below or via bank wire.');
                
                doc.moveDown(3);
                doc.fontSize(9).fillColor('#777').text('Support: support@cdc-llc.net | USA WhatsApp: +1 (929) 237-1398', { align: 'center' });
                doc.text('Sheridan, Wyoming', { align: 'center' });

                doc.end();
            });
        };

        const serverPdfBase64 = await generateServerPDF();

        // অ্যাটাচমেন্ট প্রসেসিং (অন্যান্য আপলোড করা ফাইল + সার্ভার জেনারেটেড পিডিএফ)
        let finalAttachments = [];
        
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(att => {
                // ফ্রন্টএন্ড থেকে আসা ফাকা বা ডুপ্লিকেট ইনভয়েস পিডিএফ বাদ দিয়ে দেব
                if (att && att.fileData && !att.fileName.includes('Invoice_')) {
                    const base64Data = att.fileData.includes('base64,') ? att.fileData.split(';base64,').pop() : att.fileData;
                    finalAttachments.push({
                        filename: att.fileName || 'Document.pdf',
                        content: base64Data,
                        encoding: 'base64'
                    });
                }
            });
        }

        // সার্ভার থেকে তৈরি করা নিখুঁত পিডিএফ অ্যাটাচমেন্টে যুক্ত করা হলো
        finalAttachments.push({
            filename: `Invoice_${invoiceNumber || 'CDC'}.pdf`,
            content: serverPdfBase64,
            encoding: 'base64'
        });

        const fallbackHtml = `
            <div style="font-family: Arial, sans-serif; padding: 25px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
                <h2 style="color: #0056b3; margin-top: 0;">Civil Design & Construction LLC</h2>
                <p>Hello,</p>
                <p>You have received a new invoice (<strong>${invoiceNumber || 'CDC-INV'}</strong>) from <strong>Civil Design & Construction LLC</strong>.</p>
                <p>Please check the attached PDF document for the complete invoice summary and payment details.</p>
                <p style="margin-top: 25px; font-size: 13px; color: #777;">Best regards,<br><strong>Civil Design & Construction LLC</strong><br>Sheridan, Wyoming</p>
            </div>
        `;

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

        return res.status(200).json({ success: true, message: 'Email and PDF sent successfully' });
    } catch (error) {
        console.error("Mail error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
