import { apiService } from './api'

export const authService = {
  async login(credentials) {
    const response = await apiService.post('/auth/login', credentials)
    return response
  },

  async register(userData) {
    const response = await apiService.post('/auth/register', userData)
    return response
  },

  async getCurrentUser() {
    const response = await apiService.get('/auth/me')
    return response.data.user
  },

  async updateProfile(profileData) {
    const response = await apiService.put('/auth/profile', profileData)
    return response.data.user
  },

  async refreshToken() {
    const response = await apiService.post('/auth/refresh')
    return response.data
  }
}
