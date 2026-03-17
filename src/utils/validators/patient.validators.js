/**
 * Patient management validation schemas
 */

const createPatientSchema = {
  type: "object",
  required: ["name", "mobile"],
  properties: {
    name: {
      type: "string",
      minLength: 2,
      maxLength: 100,
    },
    address: {
      type: "string",
      maxLength: 500,
    },
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150,
    },
    email: {
      type: "string",
      format: "email",
      maxLength: 100,
    },
    phone: {
      type: "string",
      maxLength: 20,
    },
    mobile: {
      type: "string",
      minLength: 10,
      maxLength: 15,
    },
    education: {
      type: "string",
      maxLength: 100,
    },
    birth_date: {
      type: "string",
      format: "date",
    },
    birthplace: {
      type: "string",
      maxLength: 100,
    },
    weight: {
      type: "number",
      minimum: 0,
      maximum: 500,
    },
    occupation: {
      type: "string",
      maxLength: 100,
    },
    spouse_occupation: {
      type: "string",
      maxLength: 100,
    },
    current_ailment: {
      type: "string",
      maxLength: 1000,
    },
    recent_complaints: {
      type: "string",
      maxLength: 1000,
    },
    doctor_id: {
      type: "string",
      minLength: 1,
    },
  },
  additionalProperties: false,
};

const updatePatientSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 2,
      maxLength: 100,
    },
    address: {
      type: "string",
      maxLength: 500,
    },
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150,
    },
    email: {
      type: "string",
      format: "email",
      maxLength: 100,
    },
    phone: {
      type: "string",
      maxLength: 20,
    },
    mobile: {
      type: "string",
      minLength: 10,
      maxLength: 15,
    },
    education: {
      type: "string",
      maxLength: 100,
    },
    birth_date: {
      type: "string",
      format: "date",
    },
    birthplace: {
      type: "string",
      maxLength: 100,
    },
    weight: {
      type: "number",
      minimum: 0,
      maximum: 500,
    },
    occupation: {
      type: "string",
      maxLength: 100,
    },
    spouse_occupation: {
      type: "string",
      maxLength: 100,
    },
    current_ailment: {
      type: "string",
      maxLength: 1000,
    },
    recent_complaints: {
      type: "string",
      maxLength: 1000,
    },
    doctor_id: {
      type: "string",
      minLength: 1,
    },
  },
  additionalProperties: false,
  minProperties: 1,
};

module.exports = {
  createPatientSchema,
  updatePatientSchema,
};
