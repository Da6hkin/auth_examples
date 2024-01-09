const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const auth = require('./auth');
const { default: axios } = require('axios');
const { validateJwt } = require('./jwt');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

class Session {
	#sessions = {}

	constructor() {
		try {
			this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
			this.#sessions = JSON.parse(this.#sessions.trim());

			console.log(this.#sessions);
		} catch (e) {
			this.#sessions = {};
		}
	}

	#storeSessions() {
		fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
	}

	set(key, value) {
		if (!value) {
			value = {};
		}
		this.#sessions[key] = value;
		this.#storeSessions();
	}

	get(key) {
		return this.#sessions[key];
	}

	init(res) {
		const sessionId = uuid.v4();
		this.set(sessionId);

		return sessionId;
	}

	destroy(req, res) {
		const sessionId = req.sessionId;
		delete this.#sessions[sessionId];
		this.#storeSessions();
	}
}

const sessions = new Session();

app.use((req, res, next) => {
	let currentSession = {};
	let sessionId = req.get(SESSION_KEY);

	if (sessionId) {
		currentSession = sessions.get(sessionId);
		if (!currentSession) {
			currentSession = {};
			sessionId = sessions.init(res);
		}
	} else {
		sessionId = sessions.init(res);
	}

	req.session = currentSession;
	req.sessionId = sessionId;

	onFinished(req, () => {
		const currentSession = req.session;
		const sessionId = req.sessionId;
		sessions.set(sessionId, currentSession);
	});

	next();
});

app.use(async (req, res, next) => {
	if (req.session.username) {
		const tokenLifetime = req.session.expires_at - Math.floor(Date.now() / 1000);
		console.log(tokenLifetime);
		const refreshToken = req.session.refresh_token;
		const response = await auth.refreshAccesssToken(refreshToken, tokenLifetime);
		if (response) {
			req.session.access_token = response.access_token;
			req.session.expires_at = Math.floor(Date.now() / 1000) + response.expires_in;
		}
	}
	next();
});

app.use((req, res, next) => {
	if (req.session.access_token) {
		validateJwt(req.session.access_token);
	}
	next();
});



app.get('/', async (req, res) => {
	if (req.session.username) {
		return res.json({
			username: req.session.username,
			logout: 'http://localhost:3000/logout'
		})
	}
	res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/logout', (req, res) => {
	sessions.destroy(req, res);
	res.redirect('/');
});



app.post('/api/login', (req, res) => {
	console.log(auth.redirectUrl());
	res.redirect(auth.redirectUrl());
});

app.get('/oidc-callback', async (req, res) => {
  const tokens = await auth.getTokensFromCode(req.query.code);

  if (tokens) {
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: false,
    });
    res.cookie('access_token', tokens.access_token, {
      httpOnly: false,
      secure: false,
    });

    res.redirect('/');
  } else {
    res.status(401).send();
  }
});

app.post('/api/register', async (req, res) => {
	const { login, password } = req.body;
	const response = await auth.register(login, password);
	if (response === null) res.status(409).send()
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
