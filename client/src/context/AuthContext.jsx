import React, { createContext, useState, useContext, useEffect } from 'react'
import { authService } from '../services/authService'
import { useNotification } from '../hooks/useNotification'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { showNotification } = useNotification()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const userData = await authService.getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      setUser(user)
      setIsAuthenticated(true)
      
      showNotification('登入成功', 'success')
      return response
    } catch (error) {
      showNotification(error.response?.data?.message || '登入失敗', 'error')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
    showNotification('已成功登出', 'info')
  }

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData)
      setUser(updatedUser)
      showNotification('個人資料更新成功', 'success')
      return updatedUser
    } catch (error) {
      showNotification(error.response?.data?.message || '更新失敗', 'error')
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateProfile,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
