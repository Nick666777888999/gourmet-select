import { apiService } from './api'

export const mealService = {
  async getMeals(filters = {}) {
    const params = new URLSearchParams()
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        if (Array.isArray(filters[key])) {
          filters[key].forEach(value => params.append(key, value))
        } else {
          params.append(key, filters[key])
        }
      }
    })

    const response = await apiService.get(`/meals?${params.toString()}`)
    return response
  },

  async getMealById(id) {
    const response = await apiService.get(`/meals/${id}`)
    return response
  },

  async createMeal(mealData) {
    const response = await apiService.post('/meals', mealData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  async updateMeal(id, mealData) {
    const response = await apiService.put(`/meals/${id}`, mealData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  async deleteMeal(id) {
    const response = await apiService.delete(`/meals/${id}`)
    return response
  },

  async getPopularMeals(params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await apiService.get(`/meals/popular?${queryParams.toString()}`)
    return response
  },

  async searchMeals(query) {
    const response = await apiService.get(`/meals/search/${encodeURIComponent(query)}`)
    return response
  },

  async getCategoryStats() {
    const response = await apiService.get('/meals/stats/categories')
    return response
  },

  async uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiService.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  }
}
