import PDFDocument from "pdfkit";

export const generatePkSummaryPDF = async (patient, panchakarmaPlan, sessions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text("Panchakarma Treatment Summary", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).text(`Patient Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`Procedure: ${panchakarmaPlan.procedureType}`);
      doc.text(`Status: ${panchakarmaPlan.status}`);
      doc.moveDown();

      doc.fontSize(14).text("Session Log", { underline: true });
      if (!sessions || sessions.length === 0) {
        doc.fontSize(10).text("No sessions logged.");
      } else {
        sessions.forEach((s, i) => {
          doc.fontSize(10).text(`Session ${i + 1} (${s.date}) - Status: ${s.status}`);
          if (s.notes) doc.text(`  Notes: ${s.notes}`);
          doc.moveDown(0.5);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
