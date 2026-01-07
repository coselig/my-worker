/**
 * Cloudflare Worker - 完整登入 + Session 範例
 */

import { corsHeaders, jsonResponse, generateSessionId, setCookie } from './utils.js';
import { handleLogin, handleMe, handleLogout, handleRegister } from './auth.js';
import { handleEmployees, handleWorkingStaff } from './employees.js';
import { handleManualPunch, checkIn, checkOut, getToday, getMonth } from './attendance.js';
import { handleGetDevices, handleAddDevice, handleDeleteDevice, handleUpdateDevice, handleSaveConfiguration, handleLoadConfiguration, handleGetConfigurations, handleDeleteConfiguration } from './discovery.js';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// Handler functions
async function handleHealth(request, env) {
	return jsonResponse({ ok: true, message: "Worker is alive" }, 200, request);
}

// 路由表
const routes = {
	GET: {
		"/api/health": handleHealth,
		"/api/me": handleMe,
		"/api/employees": handleEmployees,
		"/api/working-staff": handleWorkingStaff,
		"/api/attendance/month": getMonth,
		"/api/devices": handleGetDevices,
		"/api/configurations": handleGetConfigurations,
		"/api/configurations/load": handleLoadConfiguration,
	},
	POST: {
		"/api/login": handleLogin,
		"/api/logout": handleLogout,
		"/api/register": handleRegister,
		"/api/manual-punch": handleManualPunch,
		"/api/devices": handleAddDevice,
		"/api/configurations": handleSaveConfiguration,
	},
	PUT: {
		"/api/devices": handleUpdateDevice,
	},
	DELETE: {
		"/api/devices": handleDeleteDevice,
		"/api/configurations": handleDeleteConfiguration,
	},
};

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request),
			});
		}
		if (request.method === 'POST' && url.pathname === '/api/attendance/check-in') {
			return checkIn(request, env);
		}
		if (request.method === 'POST' && url.pathname === '/api/attendance/check-out') {
			return checkOut(request, env);
		}
		if (request.method === 'GET' && url.pathname === '/api/attendance/today') {
			return getToday(request, env);
		}
		try {
			const methodRoutes = routes[request.method];
			const handler = methodRoutes && methodRoutes[url.pathname];
			if (handler) {
				return await handler(request, env);
			}
			// 如果不是 API 路由，嘗試服務靜態文件
			let assetRequest = request;
			if (url.pathname === '/') {
				// 對於根路徑，返回 index.html
				const newUrl = new URL(request.url);
				newUrl.pathname = '/index.html';
				assetRequest = new Request(newUrl, request);
			}
			try {
				return await getAssetFromKV(
					{ request: assetRequest },
					{
						ASSET_NAMESPACE: env.STATIC_ASSETS,
						cacheControl: {
							browserTTL: 60 * 60 * 24 * 30,
							edgeTTL: 60 * 60 * 24 * 30,
							bypassCache: false,
						},
					}
				);
			} catch (e) {
			// 如果沒有找到靜態文件，返回 404
				return jsonResponse({ error: "Not Found" }, 404, request);
			}
		} catch (err) {
			return jsonResponse({ error: "Internal Server Error", detail: err?.message ?? String(err) }, 500, request);
		}
	},
};