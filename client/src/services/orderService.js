import { apiService } from './api'

export const orderService = {
  async createOrder(orderData) {
    const response = await apiService.post('/orders', orderData)
    return response
  },

  async getOrders(filters = {}) {
    const params = new URLSearchParams(filters)
    const response = await apiService.get(`/orders?${params.toString()}`)
    return response
  },

  async getOrderById(id) {
    const response = await apiService.get(`/orders/${id}`)
    return response
  },

  async cancelOrder(id) {
    const response = await apiService.put(`/orders/${id}/cancel`)
    return response
  },

  async getOrderStats() {
    const response = await apiService.get('/orders/stats')
    return response
  }
}
