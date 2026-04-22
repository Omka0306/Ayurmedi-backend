/**
 * Cognito Pre Token Generation Lambda Trigger
 * Injects custom:hospitalId and custom:role claims into access and ID tokens
 */
export const handler = async (event) => {
  const { request, response } = event;
  const userAttributes = request.userAttributes || {};

  // Copy custom claims to both access and ID tokens
  const claimsToAdd = {};
  
  if (userAttributes["custom:hospitalId"]) {
    claimsToAdd["custom:hospitalId"] = userAttributes["custom:hospitalId"];
  }
  if (userAttributes["custom:role"]) {
    claimsToAdd["custom:role"] = userAttributes["custom:role"];
  }
  if (userAttributes["custom:branchId"]) {
    claimsToAdd["custom:branchId"] = userAttributes["custom:branchId"];
  }

  // Add to access token claims
  if (!response.claimsOverrideDetails) {
    response.claimsOverrideDetails = {};
  }
  if (!response.claimsOverrideDetails.accessTokenClaims) {
    response.claimsOverrideDetails.accessTokenClaims = {};
  }
  if (!response.claimsOverrideDetails.idTokenClaims) {
    response.claimsOverrideDetails.idTokenClaims = {};
  }

  Object.assign(response.claimsOverrideDetails.accessTokenClaims, claimsToAdd);
  Object.assign(response.claimsOverrideDetails.idTokenClaims, claimsToAdd);

  console.log("Pre Token Gen: Added claims", claimsToAdd);
  return event;
};
