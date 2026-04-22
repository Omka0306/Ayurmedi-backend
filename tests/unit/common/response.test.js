import { jest } from '@jest/globals';
import { success, error, paginated } from "../../../src/common/response.js";

describe("response.js", () => {
  it("success() should format response properly", () => {
    const res = success({ id: 1 }, 201);
    expect(res.statusCode).toBe(201);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(res.headers["Content-Type"]).toBe("application/json");
    
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(1);
  });

  it("error() should format error response properly", () => {
    const res = error("Not Found", 404);
    expect(res.statusCode).toBe(404);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Not Found");
  });

  it("paginated() should format paginated response properly", () => {
    const res = paginated([{ id: 1 }], "next_token");
    expect(res.statusCode).toBe(200);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([{ id: 1 }]);
    expect(body.data.lastKey).toBe("next_token");
  });
});
