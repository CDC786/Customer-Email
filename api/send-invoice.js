import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
    // CORS হেডার যুক্ত করা যাতে লোকাল অ্যাপ বা ডেস্কটপ থেকে রিকোয়েস্ট ব্লক না হয়
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { clientEmail, invoiceNumber, htmlBody, attachmentsList } = req.body;

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is required' });
        }

        // জিমেইল কনফিগারেশন
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS  
            }
        });

        // সার্ভার-সাইডে পিডিএফ জেনারেট করার ফাংশন
        const generateServerPDF = () => {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
                doc.on('error', reject);

                doc.fontSize(22).fillColor('#0056b3').text('Civil Design & Construction LLC', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(14).fillColor('#444').text(`INVOICE: ${invoiceNumber || 'CDC-INV'}`, { align: 'center' });
                doc.moveDown(1.5);
                
                doc.fontSize(11).fillColor('#333').text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                doc.text(`Billed To: ${clientEmail}`);
                doc.moveDown(1.5);

                doc.fontSize(13).fillColor('#0056b3').text('Invoice Summary & Payment Instructions:');
                doc.fontSize(10).fillColor('#555').text('Thank you for your business. Please check your email for complete service items, milestones, and secure payment/bank wire details.');
                
                doc.moveDown(4);
                doc.fontSize(10).fillColor('#777').text('Support: support@cdc-llc.net | USA WhatsApp: +1 (929) 237-1398', { align: 'center' });
                doc.text('Sheridan, Wyoming', { align: 'center' });

                doc.end();
            });
        };

        const serverPdfBase64 = await generateServerPDF();

        // অ্যাটাচমেন্ট প্রসেসিং
        let finalAttachments = [];
        
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(att => {
                if (att && att.fileData) {
                    const base64Data = att.fileData.includes('base64,') ? att.fileData.split(';base64,').pop() : att.fileData;
                    finalAttachments.push({
                        filename: att.fileName || 'Document.pdf',
                        content: base64Data,
                        encoding: 'base64'
                    });
                }
            });
        }

        // সার্ভার-জেনারেটেড পিডিএফ যুক্ত করা
        finalAttachments.push({
            filename: `Invoice_${invoiceNumber || 'CDC'}.pdf`,
            content: serverPdfBase64,
            encoding: 'base64'
        });

        const mailOptions = {
            from: '"Civil Design & Construction LLC" <joincdc@gmail.com>',
            replyTo: 'support@cdc-llc.net', 
            to: clientEmail,
            bcc: process.env.GMAIL_USER, 
            subject: `Invoice (${invoiceNumber || 'CDC'}) - Civil Design & Construction LLC`,
            html: htmlBody || '<p>Please find your invoice attached.</p>',
            attachments: finalAttachments
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Email and PDF sent successfully' });
    } catch (error) {
        console.error("Backend Invoice Email error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
