const API_BASE = '/api/v1';

class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
        // Try refresh
        const refreshed = await tryRefresh();
        if (refreshed) {
            config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, config);
            if (!retryResponse.ok) {
                const err = await retryResponse.json().catch(() => ({}));
                throw new ApiError(err.error || 'Request failed', retryResponse.status, err.details);
            }
            return retryResponse.json();
        }
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new ApiError('Session expired', 401);
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new ApiError(err.error || 'Request failed', response.status, err.details);
    }

    return response.json();
}

async function tryRefresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

const api = {
    get: (endpoint) => request(endpoint),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
export { ApiError };
