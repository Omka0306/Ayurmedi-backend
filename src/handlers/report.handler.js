const { ok, badRequest, serverError } = require('../utils/response.util');
const { toHttpResponse, isAppError } = require('../utils/error.util');
const { verifyJwtToken } = require('../middlewares/auth.middleware');
const { roleGuard } = require('../middlewares/role.middleware');
const logger = require('../utils/logger.util');
const { getVisitById } = require('../persistence/visit.repo');
const { getPatientById } = require('../persistence/patient.repo');
const { getHistoryByVisit } = require('../persistence/patient-history.repo');
const {
  getPrescriptionByVisitId,
  getItemsByPrescription,
} = require('../persistence/visit-prescription.repo');
const { getVisitsByPatient } = require('../persistence/visit.repo');
const { getBillByVisitId } = require('../persistence/billing.repo');
const { AppError } = require('../utils/error.util');

const ALL_STAFF_ROLES = ['RECEPTION', 'DOCTOR', 'ASSISTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

const handleError = (err) => {
  logger.error('Report handler error:', err);
  if (isAppError(err)) return toHttpResponse(err);
  return serverError('An unexpected error occurred');
};

/**
 * GET /visits/{id}/report
 * Full visit report: patient details + visit info + history + prescription + items + bill
 * This is the printable patient discharge/visit report
 */
module.exports.visitReport = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const visitId = event.pathParameters?.id;
    if (!visitId) return badRequest('Visit ID is required');

    const visit = await getVisitById(visitId);
    if (!visit) throw new AppError('Visit not found', { statusCode: 404 });

    if (visit.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Access denied', { statusCode: 403 });
    }

    // Gather all data in parallel
    const [patient, history, prescription, bill] = await Promise.all([
      getPatientById(visit.patient_id),
      getHistoryByVisit(visitId),
      getPrescriptionByVisitId(visitId),
      getBillByVisitId(visitId),
    ]);

    let prescriptionItems = [];
    if (prescription) {
      prescriptionItems = await getItemsByPrescription(prescription.prescription_id);
    }

    return ok({
      report_type: 'visit_report',
      generated_at: new Date().toISOString(),
      visit,
      patient,
      history: history || null,
      prescription: prescription || null,
      prescription_items: prescriptionItems,
      bill: bill || null,
    });
  } catch (err) {
    return handleError(err);
  }
};

/**
 * GET /patients/{id}/history-report
 * Full patient history across ALL visits
 */
module.exports.patientHistoryReport = async (event) => {
  try {
    const authContext = await verifyJwtToken(event.headers.Authorization || event.headers.authorization);
    roleGuard(authContext, ALL_STAFF_ROLES);

    const patientId = event.pathParameters?.id;
    if (!patientId) return badRequest('Patient ID is required');

    const patient = await getPatientById(patientId);
    if (!patient) throw new AppError('Patient not found', { statusCode: 404 });

    if (patient.hospital_id !== authContext.hospital_id && authContext.role !== 'SUPER_ADMIN') {
      throw new AppError('Access denied', { statusCode: 403 });
    }

    // Get all visits for this patient
    const visits = await getVisitsByPatient(patientId, { limit: 100 });

    // For each visit, load prescription + items in parallel
    const visitSummaries = await Promise.all(
      visits.map(async (visit) => {
        const [history, prescription, bill] = await Promise.all([
          getHistoryByVisit(visit.visit_id),
          getPrescriptionByVisitId(visit.visit_id),
          getBillByVisitId(visit.visit_id),
        ]);

        let prescriptionItems = [];
        if (prescription) {
          prescriptionItems = await getItemsByPrescription(prescription.prescription_id);
        }

        return {
          visit,
          history: history || null,
          prescription: prescription || null,
          prescription_items: prescriptionItems,
          bill: bill || null,
        };
      })
    );

    return ok({
      report_type: 'patient_history_report',
      generated_at: new Date().toISOString(),
      patient,
      total_visits: visits.length,
      visits: visitSummaries,
    });
  } catch (err) {
    return handleError(err);
  }
};
