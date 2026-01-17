import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum UserRole {
  GUEST = 'GUEST',
  GENERAL_USER = 'GENERAL_USER',
  COLLEGE_USER = 'COLLEGE_USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  role: UserRole
  collegeId?: string
  profilePictureUrl?: string
  bio?: string
  createdAt: Date
}

export interface College {
  id: string
  name: string
  emailDomain: string
  logoUrl: string
}

interface AuthState {
  user: User | null
  token: string | null
  college: College | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setCollege: (college: College | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      college: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setCollege: (college) => set({ college }),
      setLoading: (isLoading) => set({ isLoading }),
      
      logout: () => set({
        user: null,
        token: null,
        college: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'ctn-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false)
      },
    }
  )
)
