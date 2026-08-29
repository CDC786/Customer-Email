// সার্ভার-সাইডে একদম নিখুঁত এবং কালারফুল পিডিএফ তৈরির ফাংশন
        const generateServerPDF = () => {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 40, size: 'A4' });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));
                doc.on('error', reject);

                // Header / Company Name
                doc.fontSize(20).fillColor('#0056b3').text('Civil Design & Construction LLC', { align: 'left' });
                doc.fontSize(10).fillColor('#555').text('Sheridan, Wyoming | support@cdc-llc.net | +1 (929) 237-1398');
                
                doc.moveDown();
                doc.strokeColor('#0056b3').lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
                doc.moveDown();

                // Invoice Title & Number
                doc.fontSize(22).fillColor('#222').text('INVOICE', { align: 'right' });
                doc.fontSize(11.5).fillColor('#555').text(`Invoice Number: ${invoiceNumber || 'CDC-INV'}`, { align: 'right' });
                doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
                
                doc.moveDown(1.5);

                // Billed To Section
                doc.fontSize(12).fillColor('#0056b3').text('BILLED TO:');
                doc.fontSize(11).fillColor('#333').text(`Client Email: ${clientEmail}`);
                
                doc.moveDown(2);

                // Table Header Background Simulation
                doc.rect(40, doc.y, 515, 25).fill('#0056b3');
                doc.fillColor('#fff').fontSize(11).text('Description / Service Summary', 50, doc.y + 7);
                doc.text('Amount', 450, doc.y - 12, { align: 'right', width: 95 });
                
                doc.moveDown(2);

                // Item Row
                doc.fillColor('#333').fontSize(10.5).text('Custom Project Consulting & Engineering Services', 50, doc.y);
                doc.text('As Agreed', 450, doc.y - 12, { align: 'right', width: 95 });

                doc.moveDown(3);
                doc.strokeColor('#ddd').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
                doc.moveDown();

                // Payment Instructions Note
                doc.fontSize(10).fillColor('#8a6d3b').text('Payment Instructions: Please complete your payment using the secure online payment link or bank wire details provided in the email body.', { width: 515 });

                // Footer
                doc.moveDown(5);
                doc.fontSize(9).fillColor('#777').text('Thank you for your business! | Civil Design & Construction LLC', { align: 'center' });

                doc.end();
            });
        };
