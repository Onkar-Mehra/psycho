const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async logout() {
    return this.request('/logout', {
      method: 'POST'
    });
  }

  async checkAuth() {
    return this.request('/check-auth');
  }

  // User details endpoints
  async saveUserDetails(details) {
    return this.request('/user-details', {
      method: 'POST',
      body: JSON.stringify(details)
    });
  }

  async getUserDetails() {
    return this.request('/user-details');
  }

  // Questions endpoints
  async getQuestions(formType) {
    return this.request(`/questions/${formType}`);
  }

  // Progress and responses endpoints
  async saveProgress(progressData) {
    return this.request('/save-progress', {
      method: 'POST',
      body: JSON.stringify(progressData)
    });
  }

  async submitForm(formData) {
    return this.request('/submit-form', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  }

  async getProgress() {
    return this.request('/progress');
  }
  
  async getSavedResponses(formName) {
    return this.request(`/responses/${formName}`);
  }

}


export const apiClient = new ApiClient();
export default apiClient;