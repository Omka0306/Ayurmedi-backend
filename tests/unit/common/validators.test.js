import Joi from "joi";
import { schemas, validateBody, validatePathParams } from "../../../src/common/validators.js";
import { ValidationError } from "../../../src/common/errors.js";

describe("validators.js", () => {
  it("validateBody should pass and parse valid JSON body", () => {
    const middleware = validateBody(schemas.hospitalId);
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const event = { body: JSON.stringify(validUuid) };
    const result = middleware(event);
    expect(result).toBe(validUuid);
  });

  it("validateBody should support already parsed JSON body", () => {
    const schema = Joi.object({ id: schemas.hospitalId });
    const middleware = validateBody(schema);
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const event = { body: { id: validUuid } }; // API Gateway sometimes provides object
    const result = middleware(event);
    expect(result).toEqual({ id: validUuid });
  });

  it("validateBody should throw ValidationError for invalid JSON", () => {
    const middleware = validateBody(schemas.uuid);
    const event = { body: "{ bad_json" };
    expect(() => middleware(event)).toThrow(ValidationError);
    expect(() => middleware(event)).toThrow("Invalid JSON body");
  });

  it("validateBody should throw ValidationError for invalid schema", () => {
    const middleware = validateBody(schemas.email);
    const event = { body: JSON.stringify("not-an-email") };
    expect(() => middleware(event)).toThrow(ValidationError);
  });

  it("validatePathParams should pass valid params", () => {
    const schema = Joi.object({ id: schemas.uuid });
    const middleware = validatePathParams(schema);
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const event = { pathParameters: { id: validUuid } };
    const result = middleware(event);
    expect(result).toEqual({ id: validUuid });
  });

  it("validatePathParams should throw ValidationError on missing params", () => {
    const schema = Joi.object({ id: schemas.uuid });
    const middleware = validatePathParams(schema);
    const event = {}; 
    expect(() => middleware(event)).toThrow(ValidationError);
  });

  it("indianMobile should validate indian mobile numbers correctly", () => {
    expect(() => validateBody(schemas.indianMobile)({ body: JSON.stringify("9876543210") })).not.toThrow();
    expect(() => validateBody(schemas.indianMobile)({ body: JSON.stringify("12345") })).toThrow();
  });
});
