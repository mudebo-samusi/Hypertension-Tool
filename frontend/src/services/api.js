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
        const noAuthRequired = ['/login', '/register', '/request-password-reset', '/reset-password'].includes(config.url);
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

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Handle token expiration
        if (error.response?.status === 401) {
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
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user)); // Save user data
    }
    return response;
};

// Add a method to check if user is authenticated
api.isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
};

// Add a method to get the current user
api.getCurrentUser = () => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
};

// Add logout method
api.logout = () => {
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

// Fix getReadings method to explicitly handle the token
api.getReadings = async () => {
    try {
        // Get the token directly
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No access token found');
        }

        // Make a direct axios call with explicit headers
        const response = await axios.get(`${api.defaults.baseURL}/get-readings`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.trim()}`
            }
        });
        
        // Check and log response
        console.log("Reading response:", response.data);
        
        return { readings: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
        console.error("Error in getReadings:", error);
        
        // Log more detailed error information
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
            console.error("Error response headers:", error.response.headers);
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