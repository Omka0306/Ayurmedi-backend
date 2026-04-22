import PDFDocument from "pdfkit";

export const generateFullHistoryPDF = async (patient, consultations, prescriptions, pkSessions, bills) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text("Comprehensive Patient History", { align: "center" });
      doc.moveDown();

      // Patient Info
      doc.fontSize(12).text(`Patient Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`UHID: ${patient.uhid}`);
      doc.text(`Age/Gender: ${patient.age} / ${patient.gender}`);
      doc.moveDown();

      // Consultations
      doc.fontSize(14).text("Consultations", { underline: true });
      if (!consultations || consultations.length === 0) {
        doc.fontSize(10).text("No consultations recorded.");
      } else {
        consultations.forEach(c => {
          doc.fontSize(10).text(`Date: ${c.consultDate} | Doctor: ${c.doctorId}`);
          doc.text(`Diagnosis: ${c.provisionalDiagnosis || "N/A"}`);
          doc.moveDown(0.5);
        });
      }
      doc.moveDown();

      // Prescriptions
      doc.fontSize(14).text("Prescriptions", { underline: true });
      if (!prescriptions || prescriptions.length === 0) {
        doc.fontSize(10).text("No prescriptions recorded.");
      } else {
        prescriptions.forEach(rx => {
          doc.fontSize(10).text(`Rx Date: ${rx.createdAt}`);
          rx.medicines?.forEach(m => doc.text(`- ${m.medicineName} (${m.dosageQty} ${m.dosageForm}) - ${m.frequency}`));
          doc.moveDown(0.5);
        });
      }
      doc.moveDown();

      // Panchakarma
      doc.fontSize(14).text("Panchakarma Sessions", { underline: true });
      if (!pkSessions || pkSessions.length === 0) {
        doc.fontSize(10).text("No Panchakarma history.");
      } else {
        doc.fontSize(10).text(`Total Sessions: ${pkSessions.length}`);
      }

      // Financials
      doc.moveDown();
      doc.fontSize(14).text("Financial Summary", { underline: true });
      const totalBilled = bills?.reduce((acc, b) => acc + (b.totalAmount || 0), 0) || 0;
      doc.fontSize(10).text(`Total Billed: $${totalBilled}`);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
