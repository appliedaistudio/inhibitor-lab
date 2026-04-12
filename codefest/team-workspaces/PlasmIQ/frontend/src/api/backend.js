import axios from 'axios'

const backend = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

backend.interceptors.request.use((config) => {
  const token = localStorage.getItem('plasmiq_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

backend.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('plasmiq_token')
      localStorage.removeItem('plasmiq_donor')
      window.location.href = '/auth/login'
    }
    return Promise.reject(err)
  }
)

export default backend
