import PDFDocument from "pdfkit";

export const generateBillPDF = async (bill, hospital, patient) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).text(hospital?.name || "Hospital", { align: "center" });
      if (hospital?.address) doc.fontSize(10).text(hospital.address, { align: "center" });
      doc.moveDown();

      doc.fontSize(16).text("INVOICE", { align: "center", underline: true });
      doc.moveDown();

      // Meta
      doc.fontSize(10);
      doc.text(`Bill ID: ${bill.billId}`);
      doc.text(`Date: ${bill.billDate}`);
      doc.text(`Patient: ${patient?.name || bill.patientId}`);
      doc.text(`Status: ${bill.status}`);
      doc.moveDown();

      // Line Items Table
      doc.fontSize(12).text("Line Items:", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      doc.text(`${"Description".padEnd(40)} ${"Qty".padEnd(6)} ${"Unit Price".padEnd(12)} Total`);
      doc.text("─".repeat(70));
      
      for (const item of bill.lineItems || []) {
        const line = `${item.description.substring(0, 38).padEnd(40)} ${String(item.quantity).padEnd(6)} ${String(item.unitPrice).padEnd(12)} ${item.total}`;
        doc.text(line);
      }

      doc.moveDown();
      doc.text("─".repeat(70));
      doc.text(`Subtotal: ${bill.subtotal}`);
      if (bill.discountAmount > 0) doc.text(`Discount: -${bill.discountAmount}`);
      if (bill.taxAmount > 0) doc.text(`Tax (${bill.taxRate}%): ${bill.taxAmount}`);
      doc.fontSize(12).text(`Total: ${bill.totalAmount}`, { bold: true });
      doc.moveDown();

      // Payment history
      if (bill.payments && bill.payments.length > 0) {
        doc.fontSize(11).text("Payment History:", { underline: true });
        doc.fontSize(9);
        for (const p of bill.payments) {
          doc.text(`${p.paidAt} - ${p.mode} - ₹${p.amount}${p.reference ? ` (Ref: ${p.reference})` : ""}`);
        }
        doc.moveDown();
      }

      doc.fontSize(12).text(`Amount Paid: ₹${bill.amountPaid}`);
      doc.text(`Balance Due: ₹${bill.balanceDue}`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
