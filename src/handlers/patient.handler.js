const {
  makeHandler,
  makePublicHandler,
  parseBody,
  parsePathParam,
  parseQuery,
  parsePagination,
} = require("../utils/handler.util");
const { ROLES } = require("../constants/config");
const workflow = require("../workflows/patient.workflow");
const {
  createPatientSchema,
  updatePatientSchema,
} = require("../utils/validators/patient.validators");
const { validateBody } = require("../utils/validators");

const ALL_STAFF = [
  ROLES.SUPER_ADMIN,
  ROLES.HOSPITAL_ADMIN,
  ROLES.DOCTOR,
  ROLES.ASSISTANT,
  ROLES.RECEPTION,
];

/**
 * Create a new patient
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context with hospital_id
 * @returns {Object} Created patient record
 */
module.exports.create = makeHandler(
  ALL_STAFF,
  async (event, ctx) => {
    const body = parseBody(event);
    validateBody(body, createPatientSchema);
    return workflow.create(body, ctx);
  },
  true,
);

module.exports.get = makeHandler(ALL_STAFF, async (event, ctx) => {
  const id = parsePathParam(event, "id");
  return workflow.get(id, ctx);
});

module.exports.list = makeHandler(ALL_STAFF, async (event, ctx) => {
  const pag = parsePagination(event);
  const res = await workflow.list(ctx, pag);
  return res && Array.isArray(res.items) ? res.items : res;
});

module.exports.search = makeHandler(ALL_STAFF, async (event, ctx) => {
  const { q } = parseQuery(event);
  return workflow.search(ctx, q);
});

/**
 * Update patient information
 * @param {Object} event - API Gateway event
 * @param {Object} ctx - Auth context with hospital_id
 * @returns {Object} Updated patient record
 */
module.exports.update = makeHandler(ALL_STAFF, async (event, ctx) => {
  const id = parsePathParam(event, "id");
  const body = parseBody(event);
  validateBody(body, updatePatientSchema);
  return workflow.update(id, body, ctx);
});
