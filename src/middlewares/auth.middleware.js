const { createRemoteJWKSet, jwtVerify } = require('jose');
const { USER_POOL_ID, AWS_REGION } = require('../constants/config');
const { getUserByCognitoId } = require('../persistence/user.repo');
const { AppError } = require('../utils/error.util');

let jwks;

const getJwks = () => {
  if (!jwks) {
    const jwksUri = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(jwksUri));
  }
  return jwks;
};

const verifyJwtToken = async (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new AppError('Authorization header missing', {
      statusCode: 401,
      code: 'AUTH_HEADER_MISSING',
    });
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Invalid Authorization header format', {
      statusCode: 401,
      code: 'AUTH_HEADER_INVALID',
    });
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
    });

    const cognitoUserId = payload.sub;
    if (!cognitoUserId) {
      throw new AppError('Invalid token payload', {
        statusCode: 401,
        code: 'TOKEN_INVALID',
      });
    }

    const user = await getUserByCognitoId(cognitoUserId);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive', {
        statusCode: 401,
        code: 'USER_NOT_ACTIVE',
      });
    }

    return {
      tokenPayload: payload,
      user,
      hospital_id: user.hospital_id,
      branch_id: user.branch_id,
      role: user.role,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', {
      statusCode: 401,
      code: 'TOKEN_VERIFICATION_FAILED',
      details: err.message,
    });
  }
};

module.exports = {
  verifyJwtToken,
};

