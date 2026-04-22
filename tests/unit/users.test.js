import { jest } from '@jest/globals';

jest.unstable_mockModule("../../src/common/db.js", () => ({
  query: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  put: jest.fn(),
  transactWrite: jest.fn()
}));

const db = await import("../../src/common/db.js");
const { listUsers, createUser, getUser, updateUser, deleteUser } = await import("../../src/modules/users/handler.js");
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

describe("users module", () => {
  let cognitoSendSpy;

  const validCaller = {
    requestContext: {
      authorizer: { userId: "723e4567-e89b-12d3-a456-426614174006", hospitalId: "123e4567-e89b-12d3-a456-4266141740001", role: "SUPER_ADMIN" }
    }
  };

  beforeEach(() => {
    db.put.mockResolvedValue({});
    cognitoSendSpy = jest.spyOn(CognitoIdentityProviderClient.prototype, "send").mockImplementation(async (command) => {
      const name = command.constructor.name;
      if (name === "AdminCreateUserCommand") {
        return { User: { Username: "newuser1", Attributes: [{ Name: "sub", Value: "newuser1" }] } };
      }
      return {};
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.get.mockReset();
    db.put.mockReset();
    db.update.mockReset();
    db.query.mockReset();
  });

  it("list users: returns paginated list scoped to hospitalId", async () => {
    db.query.mockResolvedValueOnce({ Items: [{ id: 1 }], LastEvaluatedKey: { pk: "next" } });
    const event = { ...validCaller, queryStringParameters: { limit: "10" } };
    
    const res = await listUsers(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.items.length).toBe(1);
    expect(body.data.lastKey).toBeDefined();

    expect(db.query).toHaveBeenCalledTimes(1);
    const queryArg = db.query.mock.calls[0][0];
    expect(queryArg.ExpressionAttributeValues[":hospId"]).toBe("HOSP#123e4567-e89b-12d3-a456-4266141740001");
  });

  it("create 423e4567-e89b-12d3-a456-426614174003: valid input creates 423e4567-e89b-12d3-a456-426614174003", async () => {
    const event = {
      ...validCaller,
      body: JSON.stringify({
        email: "223e4567-e89b-12d3-a456-426614174001@test.com", password: "password123", firstName: "Doc", lastName: "Tor", phone: "9876543210", role: "DOCTOR"
      })
    };
    const res = await createUser(event);
    expect(res.statusCode).toBe(201);
    expect(db.put).toHaveBeenCalledTimes(3); // one for USER, one for AUDIT
  });

  it("create 423e4567-e89b-12d3-a456-426614174003: missing role returns 400", async () => {
    const event = {
      ...validCaller,
      body: JSON.stringify({ email: "223e4567-e89b-12d3-a456-426614174001@test.com", password: "password123", firstName: "Doc", lastName: "Tor", phone: "9876543210" })
    };
    const res = await createUser(event);
    expect(res.statusCode).toBe(400);
  });

  it("get 423e4567-e89b-12d3-a456-426614174003: returns 423e4567-e89b-12d3-a456-426614174003", async () => {
    db.get.mockResolvedValueOnce({ PK: "USER#1", hospitalId: "123e4567-e89b-12d3-a456-4266141740001" });
    const event = { ...validCaller, pathParameters: { userId: "123e4567-e89b-12d3-a456-426614174000" } };
    const res = await getUser(event);
    expect(res.statusCode).toBe(200);
  });

  it("get 423e4567-e89b-12d3-a456-426614174003: wrong hospitalId returns 403", async () => {
    db.get.mockResolvedValueOnce({ PK: "USER#1", hospitalId: "123e4567-e89b-12d3-a456-4266141740002" });
    const event = { ...validCaller, pathParameters: { userId: "123e4567-e89b-12d3-a456-426614174000" } };
    const res = await getUser(event);
    expect(res.statusCode).toBe(403);
  });

  it("get 423e4567-e89b-12d3-a456-426614174003: non-existent returns 404", async () => {
    db.get.mockResolvedValueOnce(null);
    const event = { ...validCaller, pathParameters: { userId: "123e4567-e89b-12d3-a456-426614174000" } };
    const res = await getUser(event);
    expect(res.statusCode).toBe(404);
  });

  it("update 423e4567-e89b-12d3-a456-426614174003: updates fields, audit log is called", async () => {
    db.get.mockResolvedValueOnce({ PK: "USER#1", hospitalId: "123e4567-e89b-12d3-a456-4266141740001" });
    db.update.mockResolvedValueOnce({ Attributes: { firstName: "NewName" } });

    const event = {
      ...validCaller,
      pathParameters: { userId: "123e4567-e89b-12d3-a456-426614174000" },
      body: JSON.stringify({ firstName: "NewName" })
    };

    const res = await updateUser(event);
    expect(res.statusCode).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledTimes(2); 
  });

  it("delete 423e4567-e89b-12d3-a456-426614174003: soft deletes (status=INACTIVE), does not hard delete", async () => {
    db.get.mockResolvedValueOnce({ PK: "USER#1", hospitalId: "123e4567-e89b-12d3-a456-4266141740001", email: "del@test.com" });
    db.update.mockResolvedValueOnce({});

    const event = { ...validCaller, pathParameters: { userId: "123e4567-e89b-12d3-a456-426614174000" } };
    const res = await deleteUser(event);
    expect(res.statusCode).toBe(200);
    
    expect(db.update).toHaveBeenCalledTimes(1);
    const updateArg = db.update.mock.calls[0][0];
    expect(updateArg.UpdateExpression).toContain(":status");
    expect(updateArg.ExpressionAttributeValues[":status"]).toBe("INACTIVE");
  });
});
