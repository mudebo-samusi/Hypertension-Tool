import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to add token
api.interceptors.request.use(
    (config) => {
        // Skip token check for authentication endpoints
        const noAuthRequired = ['/login', '/register'].includes(config.url);
        if (noAuthRequired) {
            return config;
        }
        
        const token = localStorage.getItem('access_token');
        if (!token) {
            return Promise.reject(new Error('No access token found'));
        }
        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 422) {
            localStorage.removeItem('access_token');
            window.location.href = '/login'; // Redirect to login
        }
        return Promise.reject(error.response?.data || error);
    }
);

// Add login method
api.login = async (username, password) => {
    const response = await api.post('/login', { username, password });
    if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        return response; // This will now include both token and user data
    }
    throw new Error(response.error || 'Login failed');
};

// Add register method
api.register = async (userData) => {
    const response = await api.post('/register', userData);
    if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
    }
    return response;
};

// Add getReadings method
api.getReadings = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        throw new Error('Please login to view readings');
    }
    const response = await api.get('/get-readings');
    return response.readings || [];
};

export default api;