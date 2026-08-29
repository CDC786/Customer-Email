import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is required' });
        }

        // জিমেইল কনফিগারেশন (আপনার এনভায়রনমেন্ট ভেরিয়েবল থেকে ইউজার ও পাস নেবে)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // 📄 সার্ভার-সাইডে একদম পারফেক্ট পিডিএফ তৈরির ফাংশন (কখনো খালি হবে না)
        const generateServerPDF = () => {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
                doc.on('error', reject);

                // PDF Content Design
                doc.fontSize(22).fillColor('#0056b3').text('Civil Design & Construction LLC', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(14).fillColor('#444').text(`INVOICE: ${invoiceNumber}`, { align: 'center' });
                doc.moveDown(1.5);
                
                doc.fontSize(11).fillColor('#333').text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                doc.text(`Billed To: ${clientEmail}`);
                doc.moveDown(1.5);

                doc.fontSize(13).fillColor('#0056b3').text('Invoice Details & Summary:');
                doc.fontSize(10).fillColor('#555').text('Thank you for your business. Please check your email body for complete service items, milestones, and secure payment/bank wire instructions.');
                
                doc.moveDown(4);
                doc.fontSize(10).fillColor('#777').text('Support: support@cdc-llc.net | USA WhatsApp: +1 (929) 237-1398', { align: 'center' });
                doc.text('Sheridan, Wyoming', { align: 'center' });

                doc.end();
            });
        };

        // সার্ভার নিজেই পিডিএফ জেনারেট করবে
        const serverPdfBase64 = await generateServerPDF();

        // অ্যাটাচমেন্ট লিস্ট তৈরি করা (ফ্রন্টএন্ড থেকে আসা অন্যান্য ফাইল + সার্ভারের তৈরি করা নিখুঁত ইনভয়েস পিডিএফ)
        let finalAttachments = [];
        
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(att => {
                // যদি ফ্রন্টএন্ড থেকে কোনো ফাকা বা ছোট পিডিএফ আসে, সেটা বাদ দিয়ে আমাদের সার্ভারের তৈরি করা ফিক্সড পিডিএফ বসিয়ে দেব
                if (!att.fileName.includes('Invoice_')) {
                    finalAttachments.push({
                        filename: att.fileName,
                        content: att.fileData.split(';base64,').pop(),
                        encoding: 'base64'
                    });
                }
            });
        }

        // সার্ভার-জেনারেটেড পিডিএফ যুক্ত করা
        finalAttachments.push({
            filename: `Invoice_${invoiceNumber}.pdf`,
            content: serverPdfBase64,
            encoding: 'base64'
        });

        // মেইল অপশন
        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net', 
            to: clientEmail,
            bcc: process.env.GMAIL_USER, // আপনার নিজের মেইলে একটি কপি যাবে
            subject: `Invoice (${invoiceNumber}) - Civil Design & Construction LLC`,
            html: htmlBody || '<p>Please find your invoice attached.</p>',
            attachments: finalAttachments
        };

        // মেইল পাঠিয়ে দেওয়া
        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Email and PDF sent successfully' });
    } catch (error) {
        console.error("Backend Invoice Email error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
