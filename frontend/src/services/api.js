import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Module-level variable to cache the token
let cachedToken = localStorage.getItem('access_token');
if (cachedToken === "null" || !cachedToken) cachedToken = null;

// Add request interceptor to add token
api.interceptors.request.use(
    (config) => {
        // Normalize URL for noAuthRequired check
        const urlPath = config.url?.startsWith('/') ? config.url : `/${config.url}`;
        const noAuthRequired = ['/login', '/register', '/request-password-reset', '/reset-password', '/get-readings'].includes(urlPath);
        if (noAuthRequired) {
            return config;
        }

        // Always sync cachedToken with localStorage before each request
        cachedToken = localStorage.getItem('access_token');
        if (cachedToken === "null" || !cachedToken || typeof cachedToken !== 'string' || cachedToken.trim() === '') {
            cachedToken = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            return Promise.reject(new Error('No access token found'));
        }
        config.headers.Authorization = `Bearer ${cachedToken}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Handle token expiration
        if (error.response?.status === 401) {
            cachedToken = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login?expired=true'; // Redirect with expired flag
        }
        return Promise.reject(error.response?.data || error);
    }
);

// Fix login method
api.login = async (username, password, remember = false) => {
    try {
        // Include remember me option
        const response = await api.post('/login', { 
            username, 
            password,
            remember 
        });
        
        if (response.access_token) {
            cachedToken = response.access_token;
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            return response;
        }
        throw new Error(response.error || 'Login failed');
    } catch (error) {
        console.error("Login error details:", error);
        throw error;
    }
};

// Add register method
api.register = async (userData) => {
    const response = await api.post('/register', userData);
    if (response.access_token) {
        cachedToken = response.access_token;
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user)); // Save user data
    }
    return response;
};

// Add a method to check if user is authenticated
api.isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    return token && token !== "null";
};

// Add a method to get the current user
api.getCurrentUser = () => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
};

// Add logout method
api.logout = async () => {
    try {
        // Call backend logout endpoint to invalidate token/session
        await api.post('/logout');
    } catch (e) {
        // Ignore errors (e.g., already logged out)
    }
    cachedToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

// Add method to check token validity
api.checkTokenValidity = async () => {
    try {
        if (!api.isAuthenticated()) {
            return false;
        }
        
        // Try accessing a protected endpoint
        await api.get('/protected');
        return true;
    } catch (error) {
        if (error.response?.status === 401) {
            api.logout();
        }
        return false;
    }
};

// Fix getReadings method to use the configured api instance
api.getReadings = async () => {
    try {
        // Use the api instance which already has interceptors configured
        // to handle the authorization token
        const response = await api.get('/get-readings');
        
        return { readings: Array.isArray(response) ? response : [] };
    } catch (error) {
        console.error("Error in getReadings:", error);
        
        // Log more detailed error information
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
            console.error("Error response headers:", error.response.headers);
        }
        
        // Add authentication error flag to help components handle auth errors appropriately
        if (error.status === 401 || 
            (error.message && error.message.toLowerCase().includes('token'))) {
            error.authError = true;
        }
        
        throw error;
    }
};

// Add updateProfile method
api.updateProfile = async (userData) => {
    try {
        return await api.post('/update-profile', userData);
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

// Add password reset request method
api.requestPasswordReset = async (email) => {
    try {
        return await api.post('/request-password-reset', { email });
    } catch (error) {
        console.error("Error requesting password reset:", error);
        throw error;
    }
};

// Add reset password method
api.resetPassword = async (token, newPassword) => {
    try {
        return await api.post('/reset-password', { 
            token, 
            new_password: newPassword 
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        throw error;
    }
};

// Add prediction method
api.predict = async (readingData) => {
    try {
        return await api.post('/predict', readingData);
    } catch (error) {
        console.error("Error in prediction:", error);
        throw error;
    }
};

export default api;