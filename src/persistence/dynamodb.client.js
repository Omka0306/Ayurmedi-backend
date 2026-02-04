const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { AWS_REGION } = require('../constants/config');

let docClient;

const getDocumentClient = () => {
  if (!docClient) {
    const ddbClient = new DynamoDBClient({
      region: AWS_REGION,
    });

    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  return docClient;
};

module.exports = {
  getDocumentClient,
};

