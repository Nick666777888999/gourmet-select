import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  setupInterceptors() {
    // 請求攔截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 響應攔截器
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response) {
          // 服務器返回錯誤狀態碼
          const { status, data } = error.response

          switch (status) {
            case 401:
              console.error('未授權訪問，請重新登入')
              localStorage.removeItem('token')
              window.location.href = '/'
              break
            case 403:
              console.error('權限不足')
              break
            case 404:
              console.error('資源未找到')
              break
            case 429:
              console.error('請求過於頻繁，請稍後再試')
              break
            case 500:
              console.error('服務器內部錯誤')
              break
            default:
              console.error('請求失敗:', data.message)
          }
        } else if (error.request) {
          // 請求發送失敗
          console.error('網絡錯誤，請檢查網絡連接')
        } else {
          // 其他錯誤
          console.error('請求配置錯誤:', error.message)
        }

        return Promise.reject(error)
      }
    )
  }

  get(url, config = {}) {
    return this.client.get(url, config)
  }

  post(url, data = {}, config = {}) {
    return this.client.post(url, data, config)
  }

  put(url, data = {}, config = {}) {
    return this.client.put(url, data, config)
  }

  patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config)
  }

  delete(url, config = {}) {
    return this.client.delete(url, config)
  }
}

export const apiService = new ApiService()
