import { readFileSync } from "fs";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

export default async function globalTeardown() {
  const state = JSON.parse(readFileSync(".e2e-state.json", "utf8"));
  const client = new DynamoDBClient({ region: "ap-south-1" });

  // Delete all items with this hospitalId — query GSI2 and delete each
  console.log("Cleaning up E2E test data for hospital:", state.hospitalId);
  // Delete hospital record
  await client.send(
    new DeleteItemCommand({
      TableName: process.env.TABLE_NAME || "AyurMediTable-dev",
      Key: { PK: { S: `HOSP#${state.hospitalId}` }, SK: { S: "METADATA" } },
    }),
  );
  console.log("E2E teardown complete");
}
