import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_URL || 'https://routine-master-1fm3.onrender.com/api';

// Support mobile/network testing by dynamically swapping localhost with the actual IP
if (import.meta.env.DEV && API_BASE_URL.includes('localhost') && window.location.hostname !== 'localhost') {
    API_BASE_URL = API_BASE_URL.replace('localhost', window.location.hostname);
}

console.log('API_BASE_URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 second timeout for Render free tier cold starts
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If timeout or network error, provide clearer message
        if (error.code === 'ECONNABORTED') {
            error.message = 'Request timed out. Please check your connection.';
        }
        return Promise.reject(error);
    }
);

// Reminders
export const reminderAPI = {
    getAll: (page = 1, limit = 1000, filters = {}) => {
        let query = `/reminders?page=${page}&limit=${limit}`;
        if (filters.isActive !== undefined) query += `&isActive=${filters.isActive}`;
        return api.get(query);
    },
    create: (data) => api.post('/reminders', data),
    update: (id, data) => api.patch(`/reminders/${id}`, data),
    delete: (id) => api.delete(`/reminders/${id}`)
};

// Routines
export const routineAPI = {
    getAll: (page = 1, limit = 1000) => api.get(`/routines?page=${page}&limit=${limit}`),
    create: (data) => api.post('/routines', data),
    update: (id, data) => api.patch(`/routines/${id}`, data),
    delete: (id) => api.delete(`/routines/${id}`)
};

// Study Items
export const studyAPI = {
    getAll: () => api.get('/study'),
    getChildren: (id) => api.get(`/study/${id}/children`),
    create: (data) => api.post('/study', data),
    update: (id, data) => api.patch(`/study/${id}`, data),
    batchUpdate: (updates) => api.patch('/study/batch', { updates }),
    delete: (id) => api.delete(`/study/${id}`)
};

// Expenses
export const expenseAPI = {
    getAll: (page = 1, limit = 20, month = null, year = null) => {
        let url = `/expenses?page=${page}&limit=${limit}`;
        if (month && year) url += `&month=${month}&year=${year}`;
        return api.get(url);
    },
    getDashboardStats: () => api.get('/expenses/dashboard-stats'),
    getMonthlyStats: (year, month) => api.get(`/expenses/monthly-stats?year=${year}&month=${month}`),
    getSummary: (year, month) => api.get(`/expenses/summary/${year}/${month}`),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.patch(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`)
};

// Documents
export const documentAPI = {
    getAll: (page = 1, limit = 20) => api.get(`/documents?page=${page}&limit=${limit}`),
    upload: (formData) => api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, data) => api.patch(`/documents/${id}`, data),
    delete: (id) => api.delete(`/documents/${id}`)
};

// Attendance
export const attendanceAPI = {
    getAll: (page = 1, limit = 20) => api.get(`/attendance?page=${page}&limit=${limit}`),
    getMonthly: (year, month) => api.get(`/attendance/monthly/${year}/${month}`),
    create: (data) => api.post('/attendance', data),
    delete: (id) => api.delete(`/attendance/${id}`)
};

// Goals
export const goalAPI = {
    getAll: () => api.get('/goals'),
    getStats: () => api.get('/goals/stats'),
    create: (data) => api.post('/goals', data),
    update: (id, data) => api.patch(`/goals/${id}`, data),
    delete: (id) => api.delete(`/goals/${id}`)
};

// Focus Sessions
export const focusAPI = {
    getAll: () => api.get('/focus'),
    getStats: () => api.get('/focus/stats'),
    create: (data) => api.post('/focus', data)
};

// Habits
export const habitAPI = {
    getAll: () => api.get('/habits'),
    getStats: () => api.get('/habits/stats'),
    getDailyTrend: () => api.get('/habits/daily-trend'),
    create: (data) => api.post('/habits', data),
    complete: (id) => api.patch(`/habits/${id}/complete`),
    delete: (id) => api.delete(`/habits/${id}`)
};

// Weekly Review
export const weeklyReviewAPI = {
    getAll: () => api.get('/weekly-review'),
    getStats: () => api.get('/weekly-review/stats'),
    getCurrent: () => api.get('/weekly-review/current'),
    save: (data) => api.post('/weekly-review', data)
};

// Routine Intelligence
export const intelligenceAPI = {
    getDashboard: () => api.get('/intelligence/dashboard'),
    getCore: () => api.get('/intelligence/core'),
    generateAI: (metrics) => api.post('/intelligence/generate-ai', { metrics }),
    chat: (message, metrics) => api.post('/intelligence/chat', { message, metrics })
};

export default api;
