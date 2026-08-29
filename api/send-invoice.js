import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

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

        // সার্ভার সাইডে পিডিএফ তৈরির নিরাপদ ফাংশন
        const generateServerPDF = () => {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 40, size: 'A4' });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
                doc.on('error', reject);

                doc.fontSize(20).fillColor('#0056b3').text('Civil Design & Construction LLC', { align: 'left' });
                doc.fontSize(10).fillColor('#555').text('Sheridan, Wyoming | support@cdc-llc.net | +1 (929) 237-1398');
                
                doc.moveDown();
                doc.strokeColor('#0056b3').lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
                doc.moveDown();

                doc.fontSize(22).fillColor('#222').text('INVOICE', { align: 'right' });
                doc.fontSize(11.5).fillColor('#555').text(`Invoice Number: ${invoiceNumber || 'CDC-INV'}`, { align: 'right' });
                doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
                
                doc.moveDown(1.5);
                doc.fontSize(12).fillColor('#0056b3').text('BILLED TO:');
                doc.fontSize(11).fillColor('#333').text(`Client Email: ${clientEmail}`);
                
                doc.moveDown(2);
                doc.rect(40, doc.y, 515, 25).fill('#0056b3');
                doc.fillColor('#fff').fontSize(11).text('Description / Service Summary', 50, doc.y + 7);
                doc.text('Amount', 450, doc.y - 12, { align: 'right', width: 95 });
                
                doc.moveDown(2);
                doc.fillColor('#333').fontSize(10.5).text('Custom Project Consulting & Engineering Services', 50, doc.y);
                doc.text('As Agreed', 450, doc.y - 12, { align: 'right', width: 95 });

                doc.moveDown(3);
                doc.strokeColor('#ddd').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
                doc.moveDown();

                doc.fontSize(10).fillColor('#8a6d3b').text('Payment Instructions: Please complete your payment using the secure online payment link or bank wire details provided in the email body.', { width: 515 });

                doc.moveDown(5);
                doc.fontSize(9).fillColor('#777').text('Thank you for your business! | Civil Design & Construction LLC', { align: 'center' });

                doc.end();
            });
        };

        const serverPdfBase64 = await generateServerPDF();

        let finalAttachments = [];
        if (attachmentsList && Array.isArray(attachmentsList)) {
            attachmentsList.forEach(att => {
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

        return res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error("Backend Error:", error);
        // নিশ্চিত করুন যে সার্ভার এরর আসলেও সেটি যেন টেক্সট না হয়ে JSON ফরম্যাটে যায়
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
