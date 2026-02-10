import { PDFDocument, rgb } from 'pdf-lib';
import qr from 'qr-image';

/**
 * Stamps a PDF with a QR code on the last page.
 * @param pdfBuffer The original PDF buffer
 * @param qrContent The content to encode in the QR code (URL)
 * @returns The stamped PDF buffer
 */
export async function stampPdfWithQr(pdfBuffer: ArrayBuffer, qrContent: string): Promise<Uint8Array> {
    try {
        console.log("Stamping PDF with QR content:", qrContent);

        // 1. Generate QR Code as PNG Buffer (Sync)
        const qrPngBuffer = qr.imageSync(qrContent, { type: 'png', margin: 1 });

        // Convert Node Buffer to ArrayBuffer/Uint8Array if necessary
        // qr-image returns a Buffer, which is compatible with Uint8Array in modern environments,
        // but explicit conversion ensures safety.
        if (typeof qrPngBuffer === 'string') {
            throw new Error("QR code generation returned a string, expected a buffer.");
        }
        const qrImageBytes = new Uint8Array(qrPngBuffer);

        console.log("QR Code generated, size:", qrImageBytes.length);

        // 2. Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        console.log("PDF loaded, pages:", pdfDoc.getPageCount());

        // 3. Embed the QR Code image
        const qrImage = await pdfDoc.embedPng(qrImageBytes);

        // 4. Get the last page
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();

        // 5. Calculate position (Bottom Right)
        const qrSize = 80; // Reduced size
        const margin = 20;
        const x = width - qrSize - margin;
        const y = margin; // Bottom margin

        // 6. Draw the QR Code
        lastPage.drawImage(qrImage, {
            x,
            y,
            width: qrSize,
            height: qrSize,
        });

        // 7. Add a text label below the QR code
        lastPage.drawText('Verified by OpexIO', {
            x: x,
            y: y - 10,
            size: 8,
            // color: rgb(0, 0, 0), // Default is black
        });

        // 8. Save the PDF
        const stampedPdfBytes = await pdfDoc.save();
        console.log("PDF stamped successfully, new size:", stampedPdfBytes.length);

        return stampedPdfBytes;

    } catch (error) {
        console.error("Error stamping PDF:", error);
        throw new Error("Failed to stamp PDF with QR code");
    }
}
