import PDFDocument from "pdfkit";

export const generateDischargePDF = async (patient, hospitalDetails, dischargeNotes) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text("Discharge Summary", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).text(`Hospital Name: ${hospitalDetails.name || "AyurMedi"}`);
      doc.moveDown();

      doc.fontSize(12).text(`Patient Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`Discharge notes provided upon discharge.`);
      doc.moveDown();
      
      doc.fontSize(10).text(dischargeNotes || "No detailed notes provided.", {
        width: 400,
        align: 'justify'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
