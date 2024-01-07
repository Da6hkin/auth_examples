const jwkToPem = require('jwk-to-pem');
const jsonwebtoken = require('jsonwebtoken');
const axios = require('axios');
const { DOMAIN } = require('./auth');

const getJwks = async () => {
  const response = await axios.get('https://' + DOMAIN + "/.well-known/jwks.json");
  if (response.status !== 200) {
    return null;
  }

  return response.data.keys[0];
}

const validateJwt = async (token) => {
  const jwks = await getJwks();
  const validationResult = jsonwebtoken.verify(token, jwkToPem(jwks));
  console.log(validationResult);
  return {
    principal: {
      username: validationResult.sub,
    },
    expires: new Date(Number(validationResult.exp) * 1000),
  };
};

module.exports = {
  validateJwt,
};