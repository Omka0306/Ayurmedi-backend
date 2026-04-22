import PDFDocument from "pdfkit";

export const generateVisitSummaryPDF = async (patient, consultation, prescriptions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text("Visit Summary", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).text(`Patient Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`Date of Visit: ${consultation.consultDate}`);
      doc.text(`Doctor: ${consultation.doctorId}`);
      doc.moveDown();

      doc.fontSize(14).text("Vitals & Primary Complaints", { underline: true });
      doc.fontSize(10).text(`BP: ${consultation.vitals?.bp || "N/A"}`);
      doc.text(`Complaints: ${consultation.chiefComplaints || "None"}`);
      doc.moveDown();

      doc.fontSize(14).text("Prescriptions", { underline: true });
      if (!prescriptions || prescriptions.length === 0) {
        doc.fontSize(10).text("No medications prescribed.");
      } else {
        prescriptions.forEach(rx => {
          rx.medicines?.forEach(m => doc.text(`- ${m.medicineName}: ${m.dosageForm} ${m.frequency}`));
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
