const axios = require('axios');

const DOMAIN = 'dev-rxwzjhcvuonpsjqo.us.auth0.com';
const CLIENT_ID = 'vCJUS2JoaTlYIT8HJksgpykNwMmPYTc2';
const CLIENT_SECRET = 'nMzZ1w3aOYGyu018ilzRjnpZPbYEOS9iw7YNquMtk9orAv_Z_qhT1D9QSvQzOyic';
const API_AUDIENCE = 'https://dev-rxwzjhcvuonpsjqo.us.auth0.com/api/v2/';



const login = async (username, password) => {
  try {
    const res = await axios.post('https://' + DOMAIN + '/oauth/token', {
      grant_type: 'password',
      username: username,
      password: password,
      audience: API_AUDIENCE,
      scope: 'offline_access',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    console.log(res.data);
    return res.data;
  } catch (error) {
    console.error(error);
    return null;
  }

}

const obtainToken = async () => {
  const response = await axios.post('https://' + DOMAIN + '/oauth/token', {
    grant_type: 'client_credentials',
    audience: API_AUDIENCE,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  if (response.status !== 200) {
    return null;
  }
  return response.data.access_token;
}

const register = async (username, password) => {
  try {
    const token = await obtainToken();
    const res = await axios.post('https://' + DOMAIN + '/api/v2/users', {
      email: username,
      password,
      connection: "Username-Password-Authentication",
    },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    console.log(res.data);
    return res.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

const refreshAccesssToken = async (refreshToken, lifetime) => {
  if (lifetime >= 15) return;

  const response = await axios.post('https://' + DOMAIN + "/oauth/token", {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  console.log('Token was refreshed. New token:');
  console.log(response.data.access_token);
  return response.data;
}

module.exports = { login, register, refreshAccesssToken }