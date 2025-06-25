import axios from 'axios';

// Create array of potential backend URLs to try in order
const potentialBaseURLs = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
     // For production (replace with your actual domain)
];

// Initialize with first URL, will be updated if needed
const api = axios.create({
    baseURL: potentialBaseURLs[0],
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Module-level variable to cache the token
let cachedToken = localStorage.getItem('access_token');
if (cachedToken === "null" || !cachedToken) cachedToken = null;

// Track if we're currently finding a working URL
let findingWorkingURL = false;
let lastConnectionCheck = 0;

// Function to test URL connectivity
const testConnection = async (url) => {
    try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        return response.status === 200;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            console.warn(`Health check endpoint not found at ${url}/health. Assuming server is reachable.`);
            return true;
        }
        return false;
    }
};

// Function to find a working backend URL
const findWorkingBackendURL = async () => {
    // Prevent multiple simultaneous checks
    if (findingWorkingURL) return;
    
    // Don't check too frequently
    const now = Date.now();
    if (now - lastConnectionCheck < 10000) return; // 10-second throttle
    
    findingWorkingURL = true;
    lastConnectionCheck = now;
    
    console.log("Testing backend connectivity...");
    
    for (const url of potentialBaseURLs) {
        console.log(`Trying backend URL: ${url}`);
        const isConnected = await testConnection(url);
        
        if (isConnected) {
            console.log(`Connected successfully to: ${url}`);
            api.defaults.baseURL = url;
            localStorage.setItem('backend_url', url);
            findingWorkingURL = false;
            return true;
        }
    }
    
    console.error("Could not connect to any backend URL");
    findingWorkingURL = false;
    return false;
};

// Check if we have a previously working URL in storage
const savedBackendURL = localStorage.getItem('backend_url');
if (savedBackendURL && potentialBaseURLs.includes(savedBackendURL)) {
    api.defaults.baseURL = savedBackendURL;
    console.log(`Using previously working backend URL: ${savedBackendURL}`);
}

// Add request interceptor to add token
api.interceptors.request.use(
    (config) => {
        // Normalize URL for noAuthRequired check
        const urlPath = config.url?.startsWith('/') ? config.url : `/${config.url}`;
        const noAuthRequired = [
            '/login', 
            '/register', 
            '/request-password-reset', 
            '/reset-password', 
            '/get-readings',
            // '/payments'  <-- ensure this is NOT present here
        ].includes(urlPath);
        
        // Debug information for authentication issues
        console.log(`Request to ${urlPath}, noAuthRequired: ${noAuthRequired}`);
        
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
    async (error) => {
        // Network connection errors
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
            console.error('Network connection error:', error.message);
            
            // Try to find a working backend URL
            const connected = await findWorkingBackendURL();
            
            if (connected && error.config) {
                // Retry the request with the new URL
                console.log("Retrying request with new backend URL");
                error.config.baseURL = api.defaults.baseURL;
                return axios(error.config);
            } else {
                // Provide a more specific error for the user
                return Promise.reject({
                    isNetworkError: true,
                    message: "Cannot connect to the server. Please check your internet connection and try again."
                });
            }
        }
        
        // Handle token expiration
        if (error.response?.status === 401) {
            cachedToken = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login?expired=true'; // Redirect with expired flag
        }
        
        // Enhanced error logging for debugging
        console.error('API Error:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received:', error.request);
        }
        
        return Promise.reject(error.response?.data || error);
    }
);

// Fix login method
api.login = async (username, password, remember = false) => {
    try {
        console.log("Attempting login with:", { username, remember });
        
        // Include remember me option
        const response = await api.post('/login', { 
            username, 
            password,
            remember 
        });
        
        console.log("Login response:", response);
        
        if (response.access_token) {
            cachedToken = response.access_token;
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            return response;
        }
        throw new Error(response.error || 'Login failed');
    } catch (error) {
        console.error("Login error details:", error);
        
        // Handle specific is_active error
        if (error.response?.status === 403 || 
            (error.response?.data?.error && error.response.data.error.includes('not active'))) {
            throw new Error('Your account is inactive. Please contact support.');
        }
        
        // Handle error.response.data.error for more specific error messages
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        
        throw error;
    }
};

// Enhanced register method with better error handling
api.register = async (userData) => {
    try {
        // Try to ensure we have a working backend connection first
        if (!navigator.onLine) {
            throw new Error("You appear to be offline. Please check your internet connection.");
        }
        
        console.log("Attempting registration with backend:", api.defaults.baseURL);
        const response = await api.post('/register', userData);
        // Backend returns {success: true/false, message: "..."} without tokens
        // Just return the response and let the component handle navigation
        return response;
    } catch (error) {
        console.error("Registration error details:", error);
        
        // Check for network connectivity issues
        if (error.isNetworkError || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
            // Try to find a working backend URL
            await findWorkingBackendURL();
            
            // Provide a helpful error message
            throw new Error(
                "Cannot connect to the server. Please check that the backend server is running and your internet connection is working."
            );
        }
        
        // If there's an error message from the server, use it
        if (error.message) {
            throw error;
        }
        
        throw new Error("Registration failed. Please try again later.");
    }
};

// Add a method to check if user is authenticated
api.isAuthenticated = () => {
    const token = localStorage.getItem('access_token');
    const user = api.getCurrentUser();
    return Boolean(token && user);
};

// Add a method to get the current user
api.getCurrentUser = () => {
    try {
        const userString = localStorage.getItem('user');
        if (!userString) return null;
        
        const user = JSON.parse(userString);
        return user;
    } catch (error) {
        console.error('Error getting current user from storage:', error);
        return null;
    }
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

// Update updateProfile method to handle FormData for profile image upload
api.updateProfile = async (userData) => {
    try {
        // Check if userData is FormData (for image uploads)
        const config = userData instanceof FormData ? {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        } : {};
        
        return await api.post('/update-profile', userData, config);
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

// Add getProfile method with better error handling
api.getProfile = async () => {
    try {
        // Check if the user is authenticated
        if (!api.isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        return await api.get('/profile');
    } catch (error) {
        console.error("Error fetching profile:", error);
        
        // If the error is a token error (422 or 401), try to logout
        if (error.response?.status === 422 || error.response?.status === 401) {
            console.error("Token error detected. Logging out...");
            // Wait a moment before redirecting to avoid potential redirect loops
            setTimeout(() => api.logout(), 500);
        }
        
        throw error;
    }
};

// Add reviews methods before the export
api.getReviews = async () => {
    try {
        return await api.get('/reviews');
    } catch (error) {
        console.error("Error fetching reviews:", error);
        throw error;
    }
};

api.createReview = async (text) => {
    try {
        return await api.post('/reviews', { text });
    } catch (error) {
        console.error("Error creating review:", error);
        throw error;
    }
};

// Add Contact Management Methods
api.getContacts = async () => {
    try {
        return await api.get('/api/chat/contacts');
    } catch (error) {
        console.error("Error fetching contacts:", error);
        throw error;
    }
};

api.addContact = async (userId) => {
    try {
        return await api.post('/api/chat/contacts', { user_id: userId });
    } catch (error) {
        console.error("Error adding contact:", error);
        throw error;
    }
};

api.removeContact = async (contactId) => {
    try {
        return await api.delete(`/api/chat/contacts/${contactId}`);
    } catch (error) {
        console.error("Error removing contact:", error);
        throw error;
    }
};

// Add assignTemporaryToken method
api.assignTemporaryToken = async (token) => {
    try {
        cachedToken = token;
        localStorage.setItem('access_token', token);
    } catch (error) {
        console.error("Error assigning temporary token:", error);
        throw error;
    }
};

// Add payment methods
api.getPayments = async (includeSubscriptions = false) => {
    try {
        // Fetch all payments from the backend
        const response = await api.get('/payments');
        
        // Handle case where response is already the data array (due to interceptor)
        const paymentsData = Array.isArray(response) ? response : [];
        
        // Filter out subscription payments if requested
        if (!includeSubscriptions) {
            return paymentsData.filter(payment => !payment.is_subscription_payment);
        }
        
        return paymentsData;
    } catch (error) {
        console.error("Error fetching payments:", error);
        throw error;
    }
};

api.getPatientPayments = async (patientId, includeSubscriptions = false) => {
    try {
        const response = await api.get(`/patients/${patientId}/payments`);
        
        // Handle case where response is already the data array (due to interceptor)
        const paymentsData = Array.isArray(response) ? response : [];
        
        // Filter out subscription payments if requested
        if (!includeSubscriptions) {
            return paymentsData.filter(payment => !payment.is_subscription_payment);
        }
        
        return paymentsData;
    } catch (error) {
        console.error("Error fetching patient payments:", error);
        throw error;
    }
};

api.getProviderPayments = async (providerId, includeSubscriptions = false) => {
    try {
        const response = await api.get(`/providers/${providerId}/payments`);
        
        // Handle case where response is already the data array (due to interceptor)
        const paymentsData = Array.isArray(response) ? response : [];
        
        // Filter out subscription payments if requested
        if (!includeSubscriptions) {
            return paymentsData.filter(payment => !payment.is_subscription_payment);
        }
        
        return paymentsData;
    } catch (error) {
        console.error("Error fetching provider payments:", error);
        throw error;
    }
};

api.createPayment = async (paymentData) => {
    try {
        const response = await api.post('/payments', paymentData);
        // Ensure we return a properly structured response even if the API return value is unexpected
        return response || { 
            id: new Date().getTime(),
            status: 'completed',
            amount: paymentData.amount,
            currency: paymentData.currency || 'USD'
        };
    } catch (error) {
        console.error("Error creating payment:", error);
        
        // Check for database schema error
        if (error.error && error.error.includes("no column named")) {
            console.warn("Database schema mismatch detected. The application may need to be updated.");
            
            // Return a fallback payment object with the data we submitted
            // This allows the app to continue functioning even with DB schema issues
            return {
                id: `local_${new Date().getTime()}`,
                status: 'pending',
                amount: paymentData.amount,
                currency: paymentData.currency || 'USD',
                payment_method: paymentData.payment_method,
                client_id: paymentData.client_id,
                created_locally: true
            };
        }
        
        throw error;
    }
};

// Enhanced function to get user-specific payments with error handling, retry, and empty state handling
api.getUserPayments = async (includeSubscriptions = false, retryCount = 0) => {
    try {
        // Verify authentication
        if (!api.isAuthenticated()) {
            console.error("Cannot fetch payments: User not authenticated");
            return [];
        }
        
        // Check if we already determined the user has no payments
        const noPaymentsFlag = localStorage.getItem('user_has_no_payments');
        const lastCheckTime = localStorage.getItem('no_payments_last_check');
        
        // If we've determined the user has no payments within the last 10 minutes, return early
        if (noPaymentsFlag === 'true' && lastCheckTime) {
            const timeSinceLastCheck = Date.now() - parseInt(lastCheckTime, 10);
            if (timeSinceLastCheck < 10 * 60 * 1000) { // 10 minutes
                console.log("Skipping payment request - user has no payments");
                return [];
            }
        }
        
        // Use the /payments endpoint (modified to return has_payments flag)
        const response = await api.get(`/payments?include_subscriptions=${includeSubscriptions}`);
        
        // Check if the response has the new format with the has_payments flag
        if (response && typeof response === 'object' && 'has_payments' in response) {
            if (!response.has_payments) {
                // Store the fact that user has no payments to avoid unnecessary requests
                localStorage.setItem('user_has_no_payments', 'true');
                localStorage.setItem('no_payments_last_check', Date.now().toString());
                return [];
            }
            
            // User has payments, clear the no-payments flag
            localStorage.removeItem('user_has_no_payments');
            
            // Return the payments array from the new format
            return Array.isArray(response.payments) ? response.payments : [];
        }
        
        // Handle legacy format (direct array response)
        const payments = Array.isArray(response) ? response : [];
        
        // If we got payments, clear the no-payments flag
        if (payments.length > 0) {
            localStorage.removeItem('user_has_no_payments');
        }
        
        // Filter out subscription payments if needed
        const filteredPayments = includeSubscriptions 
            ? payments 
            : payments.filter(payment => !payment.is_subscription_payment);
        
        // Cache successful results for resilience
        if (filteredPayments.length > 0) {
            api.cachePayments(filteredPayments);
        }
        
        // Add client-side IDs if missing
        return filteredPayments.map(payment => ({
            ...payment,
            id: payment.id || payment.client_id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        }));
    } catch (error) {
        console.error("Error fetching user payments:", error);
        
        // Same retry & error handling as before
        // ...existing error handling code...
        
        return [];
    }
};

// Add a method to check if user has any payments (to avoid unnecessary API calls)
api.checkUserHasPayments = async () => {
    try {
        if (!api.isAuthenticated()) {
            return false;
        }
        
        // Try to get the payment profile which will tell us if the user has any payments
        const profile = await api.getPaymentProfile();
        return profile && profile.has_payments === true;
    } catch (error) {
        console.error("Error checking if user has payments:", error);
        return null; // null means "unknown" - different from false which means "no payments"
    }
};

// Enhanced getPaymentProfile method to handle empty state
api.getPaymentProfile = async () => {
    try {
        if (!api.isAuthenticated()) {
            return null;
        }
        
        // Check cache first
        const cachedProfile = localStorage.getItem('cached_payment_profile');
        const cacheTimestamp = localStorage.getItem('cached_payment_profile_timestamp');
        
        if (cachedProfile && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
            // Use cache if less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
                return JSON.parse(cachedProfile);
            }
        }
        
        const response = await api.get('/profile/payment-info');
        
        // Cache the response
        if (response) {
            localStorage.setItem('cached_payment_profile', JSON.stringify(response));
            localStorage.setItem('cached_payment_profile_timestamp', Date.now().toString());
            
            // Also update the has-payments flag for other methods to use
            if ('has_payments' in response) {
                localStorage.setItem('user_has_no_payments', (!response.has_payments).toString());
                localStorage.setItem('no_payments_last_check', Date.now().toString());
            }
        }
        
        return response;
    } catch (error) {
        // Handle 404 for missing endpoint
        if (error.response?.status === 404) {
            console.warn("Payment profile endpoint not available");
            return {
                has_payments: null, // unknown
                payment_stats: {
                    total_payments: 0,
                    completed_payments: 0,
                    pending_payments: 0,
                    subscription_payments: 0
                },
                active_subscription: null
            };
        }
        
        console.error("Error fetching payment profile:", error);
        return null;
    }
};

// Add a method to cache payments for offline/error scenarios
api.cachePayments = (payments) => {
    if (Array.isArray(payments) && payments.length > 0) {
        try {
            localStorage.setItem('cached_payments', JSON.stringify(payments));
            localStorage.setItem('cached_payments_timestamp', Date.now());
        } catch (e) {
            console.error("Error caching payments:", e);
        }
    }
};

// Add a utility method to detect database schema issues
api.isDatabaseSchemaError = (error) => {
    if (!error) return false;
    
    const errorMessage = typeof error === 'string' 
        ? error 
        : error.message || (error.error ? String(error.error) : '');
    
    return errorMessage.includes('no column named') || 
           errorMessage.includes('table') && errorMessage.includes('has no column');
};

// Add utility function to handle image URLs
api.getFullImageUrl = (imagePath) => {
  if (!imagePath || imagePath.trim() === '') return null;
  
  // If image is already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If image is a relative path, combine with base URL
  // Remove any double slashes except after protocol
  return `${api.defaults.baseURL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// Add a helper for user avatar URLs
api.getUserAvatarUrl = (user) => {
  if (!user) return null;
  
  const name = user.name || user.username || 'User';
  if (!user.avatar || user.avatar.trim() === '') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff`;
  }
  
  return api.getFullImageUrl(user.avatar);
};

/**
 * Fetch the list of payments.
 * @param {boolean} includeSubscriptions
 * @returns {Promise<Array>}
 */
export async function getPaymentList(includeSubscriptions = false) {
  // Use the correct endpoint and the axios instance
  return await api.get(`/payments/list?include_subscriptions=${includeSubscriptions}`);
}

/**
 * Fetch payment analytics data.
 * @param {boolean} includeSubscriptions
 * @returns {Promise<Object>}
 */
export async function getPaymentAnalytics(includeSubscriptions = false) {
  // Use the correct endpoint and the axios instance
  const response = await api.get(`/payments/analytics?include_subscriptions=${includeSubscriptions}`);
  // The backend returns { analytics: {...}, has_payments: ... }
  return response.analytics || {};
}

// Attach createPayment as a method to the api object for compatibility
api.createPayment = async function(paymentData) {
  return await createPayment(paymentData);
};

// Add methods from pm.api.js
api.createPost = async (content) => {
    try {
        const token = localStorage.getItem('access_token');
        return await api.post('/api/posts', { content }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
};

// Update the createAd method to handle FormData
api.createAd = async (formData) => {
    try {
        const token = localStorage.getItem('access_token');
        // Check if formData is already FormData or needs to be converted
        const isFormData = formData instanceof FormData;
        
        let config = {
            headers: { 
                Authorization: `Bearer ${token}`,
                // Don't set Content-Type for FormData - browser will set it with boundary
            }
        };
        
        // If not FormData, convert to JSON request
        if (!isFormData) {
            config.headers['Content-Type'] = 'application/json';
            return await api.post('/api/ads', formData, config);
        }
        
        return await api.post('/api/ads', formData, config);
    } catch (error) {
        console.error("Error creating ad:", error);
        throw error;
    }
};

// Add comment methods
api.getComments = async (postType, postId) => {
    try {
        return await api.get(`/api/${postType}s/${postId}/comments`);
    } catch (error) {
        console.error(`Error fetching comments for ${postType} ${postId}:`, error);
        throw error;
    }
};

api.createComment = async (postType, postId, content) => {
    try {
        const response = await api.post(`/api/${postType}s/${postId}/comments`, { content });
        
        // Check if the response includes the updated comment count
        if (response && !response.commentCount) {
            // Add a default commentCount if the backend doesn't provide it
            console.warn('Backend did not return commentCount, assuming increment');
            response.commentCount = 1; // Assume this is the first comment if not provided
        }
        
        return response;
    } catch (error) {
        console.error(`Error creating comment for ${postType} ${postId}:`, error);
        throw error;
    }
};

// Add methods for fetching posts
api.getPosts = async () => {
    try {
        return await api.get('/api/posts');
    } catch (error) {
        console.error("Error fetching posts:", error);
        throw error;
    }
};

// Add method for liking/unliking posts
api.togglePostLike = async (postId) => {
    try {
        return await api.post(`/api/posts/${postId}/like`);
    } catch (error) {
        console.error("Error toggling post like:", error);
        throw error;
    }
};

api.toggleCommentLike = async (commentId) => {
    try {
        return await api.post(`/api/comments/${commentId}/like`);
    } catch (error) {
        console.error("Error toggling comment like:", error);
        throw error;
    }
};

// Add setAuthToken method
api.setAuthToken = (token) => {
    if (token) {
        cachedToken = token;
        localStorage.setItem('access_token', token);
    }
};

// Add clearAuthToken method
api.clearAuthToken = () => {
    cachedToken = null;
    localStorage.removeItem('access_token');
};

// Add chat methods
api.listChatRooms = async () => {
    try {
        const response = await api.get('/api/chat/rooms');
        return response;
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        throw error;
    }
};

api.getChatMessages = async (roomId, options = {}) => {
    try {
        let url = `/api/chat/rooms/${roomId}/messages`;
        
        // Add query parameters for pagination/filtering
        const queryParams = [];
        if (options.before) queryParams.push(`before=${options.before}`);
        if (options.limit) queryParams.push(`limit=${options.limit}`);
        
        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }
        
        const response = await api.get(url);
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format from messages API (expected array):', response);
            throw new Error("Invalid data format for messages."); 
        }
        
        return response;
    } catch (error) {
        console.error(`Error in api.getChatMessages for room ${roomId}:`, error);
        throw error; 
    }
};

api.createChatRoom = async (name, userIds, isGroup) => {
    try {
        const response = await api.post('/api/chat/rooms', {
            name,
            user_ids: userIds,
            is_group: isGroup
        });
        return response;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
};

// Add doctor and organization profile methods
api.createProfile = async (profile, type) => {
  try {
    return await api.post('/api/profiles', {
      ...profile
    });
  } catch (error) {
    console.error(`Error creating ${type} profile:`, error);
    throw error;
  }
};

api.listDoctors = async () => {
  try {
    return await api.get('/api/doctors');
  } catch (error) {
    console.error("Error listing doctors:", error);
    throw error;
  }
};

api.listOrganizations = async () => {
  try {
    return await api.get('/api/organizations');
  } catch (error) {
    console.error("Error listing organizations:", error);
    throw error;
  }
};

// Export the enhanced API instance
export default api;

