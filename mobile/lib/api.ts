import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const API_URL = 'https://mymathshero.com.au'
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
  // studentId is required for difficulty-aware serving — the API picks the
  // question difficulty band from the student's SmartScore for this skill.
  // Without it the server falls back to the easy band.
  questions: (skillId: string, grade: number = 3, studentId?: string) =>
    api.get(`/api/student/questions?skillId=${skillId}&grade=${grade}&limit=10&subject=Maths${studentId ? `&studentId=${studentId}` : ''}`),
  answer: (data: any) =>
    api.post('/api/student/answer', data),
  hint: (data: any) =>
    api.post('/api/student/hint', data),
  // Structured animated whiteboard lesson for the full-screen "Teach Me" tutor.
  lesson: (data: any) =>
    api.post('/api/student/lesson', data),
  leaderboard: (studentId: string) =>
    api.get(`/api/student/leaderboard?studentId=${studentId}&type=grade&period=monthly`),
  diagnostic: (grade: number) =>
    api.get(`/api/student/diagnostic?grade=${grade}&subject=Maths`),
  submitDiagnostic: (data: any) =>
    api.post('/api/student/diagnostic', data),
  changePin: (studentId: string, newPin: string) =>
    api.post('/api/student/change-pin', { studentId, newPin }),
  setCharacter: (studentId: string, itemId: string) =>
    api.post('/api/student/avatar', { studentId, action: 'setCharacter', itemId }),
}

// Voucher API does NOT take a studentId — the server reads it from the
// authenticated session (cookie web / Authorization header mobile).
export const voucherAPI = {
  list: () => api.get('/api/student/vouchers'),
  redeem: (tierId: string) =>
    api.post('/api/student/vouchers', { tierId }),
}

export const arcadeAPI = {
  getStatus: (studentId: string) =>
    api.get(`/api/student/arcade?studentId=${studentId}`),
  unlockGame: (studentId: string, gameId: string) =>
    api.post('/api/student/arcade', {
      studentId, gameId, action: 'unlock'
    }),
  startGame: (studentId: string, gameId: string) =>
    api.post('/api/student/arcade', {
      studentId, gameId, action: 'start'
    }),
  endGame: (studentId: string, gameId: string,
    sessionId: string, durationMinutes: number) =>
    api.post('/api/student/arcade', {
      studentId, gameId, action: 'end',
      sessionId, durationMinutes
    }),
  heartbeat: (
    sessionId: string,
    studentId: string,
    durationMinutes: number
  ) =>
    api.post('/api/student/arcade-heartbeat', {
      sessionId,
      studentId,
      durationMinutes,
    }),
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
