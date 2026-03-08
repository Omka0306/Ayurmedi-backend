const billingSvc = require('../services/billing.service');

const createBill = async (visitId, payload, context) => {
  return billingSvc.createVisitBill(visitId, payload, context);
};

const getBillById = async (billId, context) => {
  return billingSvc.getBill(billId, context.hospital_id);
};

const getBillByVisit = async (visitId, context) => {
  return billingSvc.getVisitBill(visitId, context.hospital_id);
};

const payBill = async (billId, payload, context) => {
  return billingSvc.payBill(billId, payload, context.hospital_id);
};

const listBills = async (options, context) => {
  return billingSvc.listHospitalBills(context.hospital_id, options);
};

const listPatientBills = async (patientId, options, context) => {
  return billingSvc.listPatientBills(patientId, options);
};

module.exports = {
  createBill,
  getBillById,
  getBillByVisit,
  payBill,
  listBills,
  listPatientBills,
};
