import api from './api'; // Import the shared Axios instance

export default {
  createPost(content) {
    const token = localStorage.getItem('access_token');
    return api.post('/api/posts', { content }, { // Ensure POST method is used
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  createAd({ title, content, link, image }) {
    const token = localStorage.getItem('access_token');
    return api.post('/api/ads', { title, content, link, image }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
