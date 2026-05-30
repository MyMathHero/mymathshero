import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = 'https://mymathshero.com.au'
// For local testing change to your Mac IP:
// const API_URL = 'http://192.168.x.x:3000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: false,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token')
    if (token) {
      config.headers['Cookie'] = `mymathshero_token=${token}`
      config.headers['Authorization'] = `Bearer ${token}`
    }
  } catch {
    // SecureStore read failed (e.g. keychain unavailable) — continue without auth.
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    // Log but don't crash. Callers decide how to handle the rejection.
    console.error('API Error:', error?.message || 'Unknown error')
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data: any) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
}

export const studentAPI = {
  progress: (studentId: string) =>
    api.get(`/api/student/progress?studentId=${studentId}`),
  questions: (skillId: string, grade: number = 3) =>
    api.get(`/api/student/questions?skillId=${skillId}&grade=${grade}&limit=10&subject=Maths`),
  answer: (data: any) =>
    api.post('/api/student/answer', data),
  hint: (data: any) =>
    api.post('/api/student/hint', data),
  leaderboard: (studentId: string) =>
    api.get(`/api/student/leaderboard?studentId=${studentId}&type=grade&period=monthly`),
  diagnostic: (grade: number) =>
    api.get(`/api/student/diagnostic?grade=${grade}&subject=Maths`),
  submitDiagnostic: (data: any) =>
    api.post('/api/student/diagnostic', data),
}

export const parentAPI = {
  children: (parentId: string) =>
    api.get(`/api/parent/children?parentId=${parentId}`),
  progress: (studentId: string, parentId: string) =>
    api.get(`/api/student/progress?studentId=${studentId}&parentId=${parentId}`),
  insights: (studentId: string, parentId: string) =>
    api.get(`/api/parent/insights?studentId=${studentId}&parentId=${parentId}`),
}

export default api
