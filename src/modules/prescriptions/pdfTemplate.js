import PDFDocument from "pdfkit";

export const generatePDFBuffer = async (prescription, hospital) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      doc.fontSize(20).text(hospital?.name || "Ayurvedic Hospital", { align: "center" });
      if (hospital?.address) doc.fontSize(10).text(hospital.address, { align: "center" });
      if (hospital?.contactPhone) doc.fontSize(10).text(`Phone: ${hospital.contactPhone}`, { align: "center" });
      doc.moveDown(2);

      doc.fontSize(14).text("PRESCRIPTION & TREATMENT PLAN", { align: "center", underline: true });
      doc.moveDown(2);

      doc.fontSize(10).text(`Doctor ID: ${prescription.doctorId}`);
      doc.text(`Patient ID: ${prescription.patientId}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      if (prescription.medicines && prescription.medicines.length > 0) {
        doc.fontSize(12).text("Medicines prescribed:", { underline: true });
        doc.moveDown(0.5);
        prescription.medicines.forEach(med => {
          doc.fontSize(10).text(`- ${med.medicineName} (${med.dosageForm}) - ${med.dosageQty} unit(s)`);
          doc.fontSize(9).text(`  Frequency: ${med.frequency} | Timing: ${med.timing} | Duration: ${med.durationDays} days`);
          if (med.specialInstructions) doc.fontSize(9).text(`  Note: ${med.specialInstructions}`);
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      if (prescription.treatments && prescription.treatments.length > 0) {
        doc.fontSize(12).text("Recommended Treatments:", { underline: true });
        doc.moveDown(0.5);
        prescription.treatments.forEach(t => {
          doc.fontSize(10).text(`- ${t.treatmentType}`);
          if (t.notes) doc.fontSize(9).text(`  ${t.notes}`);
        });
        doc.moveDown();
      }

      if (prescription.dietInstructions) {
        doc.fontSize(12).text("Dietary Recommendations:", { underline: true });
        doc.moveDown(0.5);
        const p = prescription.dietInstructions.pathya || [];
        const a = prescription.dietInstructions.apathya || [];
        doc.fontSize(10).text(`Pathya (Beneficial): ${p.join(", ") || "None specified"}`);
        doc.text(`Apathya (Avoid): ${a.join(", ") || "None specified"}`);
        doc.moveDown();
      }

      if (prescription.lifestyleInstructions) {
        doc.fontSize(12).text("Lifestyle Routines:", { underline: true });
        doc.moveDown(0.5);
        const l = prescription.lifestyleInstructions;
        if (l.exercise) doc.fontSize(10).text(`Exercise: ${l.exercise}`);
        if (l.yoga) doc.text(`Yoga: ${l.yoga}`);
        if (l.rest) doc.text(`Rest: ${l.rest}`);
        if (l.prohibitedActivities) doc.text(`Prohibited: ${l.prohibitedActivities}`);
        doc.moveDown();
      }

      if (prescription.followUpDate) {
        doc.fontSize(12).text(`Next Follow-Up: ${prescription.followUpDate}`);
        doc.moveDown(2);
      }

      doc.moveDown(5);
      doc.fontSize(12).text("Doctor's Signature", { align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
