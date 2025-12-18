/**
 * Cloudflare Worker - 完整登入 + Session 範例
 */

function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...corsHeaders(),
			"Content-Type": "application/json",
		},
	});
}

function generateSessionId() {
	return crypto.randomUUID();
}

function setCookie(name, value, maxAge = 3600) {
	return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}


// Handler functions
async function handleHealth(request, env) {
	return jsonResponse({ ok: true, message: "Worker is alive" });
}

async function handleLogin(request, env) {
	const body = await request.json().catch(() => null);
	if (!body?.email || !body?.password) {
		return jsonResponse({ error: "Missing fields" }, 400);
	}
	const { email, password } = body;
	const user = await env.DB
		.prepare("SELECT id, name, email, password, role FROM users WHERE email = ?")
		.bind(email)
		.first();
	if (!user || user.password !== password) {
		return jsonResponse({ error: "Invalid credentials" }, 401);
	}
	const sessionId = generateSessionId();
	const expires = new Date(Date.now() + 3600 * 1000).toISOString();
	await env.DB
		.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
		.bind(sessionId, user.id, expires)
		.run();
	return new Response(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } }), {
		status: 200,
		headers: {
			...corsHeaders(),
			"Content-Type": "application/json",
			"Set-Cookie": setCookie("session_id", sessionId, 3600),
		},
	});
}

async function handleMe(request, env) {
	const cookie = request.headers.get("Cookie") || "";
	const match = cookie.match(/session_id=([a-zA-Z0-9-]+)/);
	if (!match) return jsonResponse({ error: "Not logged in" }, 401);
	const sessionId = match[1];
	const session = await env.DB
		.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
		.bind(sessionId)
		.first();
	if (!session || new Date(session.expires_at) < new Date()) {
		return jsonResponse({ error: "Session expired" }, 401);
	}
	const user = await env.DB
		.prepare("SELECT id, name, email, role FROM users WHERE id = ?")
		.bind(session.user_id)
		.first();
	return jsonResponse({ ok: true, user });
}

async function handleLogout(request, env) {
	const cookie = request.headers.get("Cookie") || "";
	const match = cookie.match(/session_id=([a-zA-Z0-9-]+)/);
	if (match) {
		const sessionId = match[1];
		await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
	}
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			...corsHeaders(),
			"Content-Type": "application/json",
			"Set-Cookie": "session_id=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
		},
	});
}

async function handleRegister(request, env) {
	const body = await request.json().catch(() => null);
	if (!body?.name || !body?.email || !body?.password || !body?.role) {
		return jsonResponse({ error: "Missing fields" }, 400);
	}
	const { name, email, password, role } = body;
	const existing = await env.DB
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.first();
	if (existing) {
		return jsonResponse({ error: "Email already exists" }, 409);
	}
	const result = await env.DB
		.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
		.bind(name, email, password, role)
		.run();
	return jsonResponse({
		ok: true,
		user: { id: result.lastInsertRowid, name, email, role },
	}, 201);
}

// 路由表
const routes = {
	GET: {
		"/api/health": handleHealth,
		"/api/me": handleMe,
	},
	POST: {
		"/api/login": handleLogin,
		"/api/logout": handleLogout,
		"/api/register": handleRegister,
	},
};

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(),
			});
		}

		const url = new URL(request.url);

		try {
			const methodRoutes = routes[request.method];
			const handler = methodRoutes && methodRoutes[url.pathname];
			if (handler) {
				return await handler(request, env);
			}
			return jsonResponse({ error: "Not Found" }, 404);
		} catch (err) {
			return jsonResponse({ error: "Internal Server Error", detail: err?.message ?? String(err) }, 500);
		}
	},
};
