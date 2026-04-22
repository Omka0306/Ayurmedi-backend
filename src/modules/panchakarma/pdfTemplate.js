import PDFDocument from "pdfkit";

export const generatePDFBuffer = async (plan, sessions, hospital) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(20).text(hospital?.name || "Ayurvedic Hospital", { align: "center" });
      if (hospital?.address) doc.fontSize(10).text(hospital.address, { align: "center" });
      doc.moveDown(2);

      doc.fontSize(16).text("PANCHAKARMA TREATMENT REPORT", { align: "center", underline: true });
      doc.moveDown(2);

      // Plan Details
      doc.fontSize(10).text(`Patient ID: ${plan.patientId}`);
      doc.text(`Doctor ID: ${plan.doctorId}`);
      doc.text(`Procedure: ${plan.procedureType}`);
      doc.text(`Timeline: ${plan.startDate} to ${plan.endDate || "Ongoing"}`);
      doc.text(`Status: ${plan.status}`);
      doc.text(`Sessions Completed: ${plan.completedSessions} / ${plan.totalSessions}`);
      doc.moveDown();

      // Sessions Table
      if (sessions && sessions.length > 0) {
        doc.fontSize(14).text("Session Log:", { underline: true });
        doc.moveDown();
        
        sessions.forEach(s => {
          doc.fontSize(10).text(`Session #${s.sessionNumber} - Date: ${s.date} - Status: ${s.status}`, { underline: true });
          doc.fontSize(9).text(`Time: ${s.startTime || "-"} to ${s.endTime || "-"}`);
          doc.text(`Therapist ID: ${s.therapistId}`);
          if (s.vitalsBefore) {
            doc.text(`Vitals Before: BP ${s.vitalsBefore.bp || "-"}, Pulse ${s.vitalsBefore.pulse || "-"}`);
          }
          if (s.vitalsAfter) {
            doc.text(`Vitals After: BP ${s.vitalsAfter.bp || "-"}, Pulse ${s.vitalsAfter.pulse || "-"}`);
          }
          if (s.observations) doc.text(`Observations: ${s.observations}`);
          if (s.doctorNotes) doc.text(`Notes: ${s.doctorNotes}`);
          
          if (s.materialsUsed && s.materialsUsed.length > 0) {
            doc.text(`Materials Used:`);
            s.materialsUsed.forEach(m => doc.text(`  - ${m.itemName || m.inventoryItemId}: ${m.quantity} ${m.unit || ""}`));
          }
          doc.moveDown();
        });
      } else {
        doc.fontSize(12).text("No sessions recorded yet.");
      }

      doc.moveDown(4);
      doc.fontSize(12).text("Doctor's Signature", { align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
