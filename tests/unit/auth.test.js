import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/common/db.js", () => ({
  get: jest.fn(),
  put: jest.fn(),
  query: jest.fn(),
  scan: jest.fn(),
  update: jest.fn(),
  transactWrite: jest.fn(),
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    decode: jest.fn(),
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
  },
}));

const db = await import("../../src/common/db.js");
const jwt = (await import("jsonwebtoken")).default;

// Import the service to get access to the cognito mock
const authService = await import("../../src/modules/auth/service.js");
const { registerHospital, login, refresh, changePassword } =
  await import("../../src/modules/auth/handler.js");

describe("auth module", () => {
  beforeEach(() => {
    db.put.mockResolvedValue({});
    db.get.mockResolvedValue({});
    db.scan.mockResolvedValue({ Items: [] });
    db.query.mockResolvedValue({ Items: [] });
    db.update.mockResolvedValue({});

    // Mock jwt.decode to return expected payload
    jwt.decode.mockReturnValue({
      sub: "u1",
      "custom:hospitalId": "h1",
      "custom:role": "SUPER_ADMIN",
    });

    // Mock the cognito client's send method
    jest
      .spyOn(authService.cognito, "send")
      .mockImplementation(async (command) => {
        const name = command.constructor.name;
        if (name === "AdminCreateUserCommand") {
          if (command.input.Username === "dup@dup.com") {
            const err = new Error("User exists");
            err.name = "UsernameExistsException";
            throw err;
          }
          return {
            User: {
              Username: "cognito-uuid",
              Attributes: [{ Name: "sub", Value: "cognito-uuid" }],
            },
          };
        }
        if (
          name === "AdminSetUserPasswordCommand" ||
          name === "AdminAddUserToGroupCommand"
        ) {
          return {};
        }
        if (name === "InitiateAuthCommand") {
          const authFlow = command.input.AuthFlow;
          const authParams = command.input.AuthParameters;

          // Handle refresh token flow
          if (
            authFlow === "REFRESH_TOKEN_AUTH" ||
            authFlow === "REFRESH_TOKEN"
          ) {
            if (authParams.REFRESH_TOKEN === "expired") {
              const err = new Error("Session expired");
              err.name = "NotAuthorizedException";
              throw err;
            }
            return {
              AuthenticationResult: {
                AccessToken: "access",
                RefreshToken: authParams.REFRESH_TOKEN,
                IdToken: "id.623e4567-e89b-12d3-a456-426614174005.jwt",
                ExpiresIn: 3600,
              },
            };
          }

          // Handle USER_PASSWORD_AUTH
          if (authParams.PASSWORD === "wrong") {
            const err = new Error("Invalid credentials");
            err.name = "NotAuthorizedException";
            throw err;
          }

          return {
            AuthenticationResult: {
              AccessToken: "access",
              RefreshToken: "refresh",
              IdToken: "id.623e4567-e89b-12d3-a456-426614174005.jwt",
              ExpiresIn: 3600,
            },
          };
        }
        if (name === "ChangePasswordCommand") {
          if (command.input.PreviousPassword === "wrong") {
            const err = new Error("Invalid credentials");
            err.name = "NotAuthorizedException";
            throw err;
          }
          return {};
        }
        return {};
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.put.mockReset();
    db.get.mockReset();
    db.scan.mockReset();
    db.query.mockReset();
    db.update.mockReset();
    jwt.decode.mockReset();
  });

  it("register-hospital: valid input creates hospital + user", async () => {
    const event = {
      body: JSON.stringify({
        hospitalName: "Test Hosp",
        adminEmail: "723e4567-e89b-12d3-a456-426614174006@test.com",
        password: "password123",
        phone: "9876543210",
        hospitalType: "AYURVEDIC",
      }),
    };
    const res = await registerHospital(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.hospitalId).toBeDefined();

    expect(authService.cognito.send).toHaveBeenCalled();
    expect(db.put).toHaveBeenCalled();
  });

  it("register-hospital: missing fields return 400", async () => {
    const event = {
      body: JSON.stringify({ hospitalName: "Test" }), // missing others
    };
    const res = await registerHospital(event);
    expect(res.statusCode).toBe(400);
  });

  it("register-hospital: duplicate email returns 409", async () => {
    const event = {
      body: JSON.stringify({
        hospitalName: "Test Hosp",
        adminEmail: "dup@dup.com",
        password: "password123",
        phone: "9876543210",
        hospitalType: "AYURVEDIC",
      }),
    };
    const res = await registerHospital(event);
    expect(res.statusCode).toBe(409);
  });

  it("login: valid credentials return tokens", async () => {
    // Seed a user in the mock database for login to find
    const testEmail = "723e4567-e89b-12d3-a456-426614174006@test.com";
    db.scan.mockResolvedValue({
      Items: [
        {
          PK: "USER#test-user-id",
          SK: "METADATA",
          entityType: "USER",
          email: testEmail,
          hospitalId: "h1",
          role: "SUPER_ADMIN",
          userId: "test-user-id",
        },
      ],
    });

    const event = {
      body: JSON.stringify({ email: testEmail, password: "password123" }),
    };
    const res = await login(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.hospitalId).toBe("h1");
  });

  it("login: wrong password returns 401", async () => {
    const event = {
      body: JSON.stringify({ email: "test@test.com", password: "wrong" }),
    };
    const res = await login(event);
    expect(res.statusCode).toBe(401);
  });

  it("refresh: valid refresh token returns new accessToken", async () => {
    const event = { body: JSON.stringify({ refreshToken: "valid" }) };
    const res = await refresh(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.accessToken).toBe("access");
  });

  it("refresh: expired refresh token returns 401", async () => {
    const event = { body: JSON.stringify({ refreshToken: "expired" }) };
    const res = await refresh(event);
    expect(res.statusCode).toBe(401);
  });

  it("change-password: works with valid current password", async () => {
    const event = {
      body: JSON.stringify({
        accessToken: "a",
        oldPassword: "old",
        newPassword: "newsecure",
      }),
    };
    const res = await changePassword(event);
    expect(res.statusCode).toBe(200);
  });

  it("change-password: fails with wrong current password", async () => {
    const event = {
      body: JSON.stringify({
        accessToken: "a",
        oldPassword: "wrong",
        newPassword: "newsecure",
      }),
    };
    const res = await changePassword(event);
    expect(res.statusCode).toBe(401);
  });
});
