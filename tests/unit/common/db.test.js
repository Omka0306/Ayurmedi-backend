import { jest } from '@jest/globals';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { get, put, update, deleteItem, query, scan, transactWrite } from "../../../src/common/db.js";
import { DatabaseError } from "../../../src/common/errors.js";

process.env.TEST_DB_SDK = "true";

describe("db.js", () => {
  let sendSpy;

  beforeEach(() => {
    sendSpy = jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async (command) => {
      if (command instanceof GetCommand) return { Item: { id: "test" } };
      if (command instanceof PutCommand) return {};
      if (command instanceof UpdateCommand) return { Attributes: { updated: true } };
      if (command instanceof DeleteCommand) return {};
      if (command instanceof QueryCommand) return { Items: [{ id: "test" }], LastEvaluatedKey: "key" };
      if (command instanceof ScanCommand) return { Items: [{ id: "test" }], LastEvaluatedKey: "key" };
      if (command instanceof TransactWriteCommand) return {};
      return {};
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("get() should successfully return an Item", async () => {
    const res = await get({ Key: { PK: "1", SK: "2" } });
    expect(res).toEqual({ id: "test" });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const sentCommand = sendSpy.mock.calls[0][0];
    expect(sentCommand.input.TableName).toBe("AyurMediTable-dev");
  });

  it("get() should throw DatabaseError on fail", async () => {
    sendSpy.mockRejectedValueOnce(new Error("AWS fail"));
    await expect(get({ Key: { PK: "1" } })).rejects.toThrow(DatabaseError);
  });

  it("put() should successfully put an Item and return the item", async () => {
    const item = { PK: "1", SK: "2" };
    const res = await put(item);
    expect(res).toEqual(item);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("put() should throw DatabaseError on fail", async () => {
    sendSpy.mockRejectedValueOnce(new Error("AWS fail"));
    await expect(put({})).rejects.toThrow(DatabaseError);
  });

  it("update() should return Attributes", async () => {
    const res = await update({ Key: { PK: "1", SK: "2" } });
    expect(res).toEqual({ updated: true });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("deleteItem() should return true", async () => {
    const res = await deleteItem({ Key: { PK: "1", SK: "2" } });
    expect(res).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("query() should return Items and LastEvaluatedKey", async () => {
    const res = await query({ KeyConditionExpression: "PK = :pk" });
    expect(res).toEqual({ Items: [{ id: "test" }], LastEvaluatedKey: "key" });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("scan() should return Items and LastEvaluatedKey", async () => {
    const res = await scan();
    expect(res).toEqual({ Items: [{ id: "test" }], LastEvaluatedKey: "key" });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("transactWrite() should successfully inject TableName and execute", async () => {
    const params = {
      TransactItems: [
        {
          Put: {
            Item: { PK: "1" }
          }
        }
      ]
    };
    const res = await transactWrite(params);
    expect(res).toBe(true);
    const sentCommand = sendSpy.mock.calls[0][0];
    expect(sentCommand.input.TransactItems[0].Put.TableName).toBe("AyurMediTable-dev");
  });

  it("transactWrite() should throw DatabaseError on fail", async () => {
    sendSpy.mockRejectedValueOnce(new Error("Some transaction error"));
    await expect(transactWrite({ TransactItems: [] })).rejects.toThrow(DatabaseError);
  });
});
