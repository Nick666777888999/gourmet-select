import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { MealProvider } from './context/MealContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoadingSpinner from './components/animations/LoadingSpinner'
import NotificationContainer from './components/common/NotificationContainer'

// 頁面組件
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MealDetailPage from './pages/MealDetailPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import SearchPage from './pages/SearchPage'
import CategoriesPage from './pages/CategoriesPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <MealProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NotificationContainer />
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/meal/:id" 
                  element={
                    <ProtectedRoute>
                      <MealDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/orders" 
                  element={
                    <ProtectedRoute>
                      <OrderHistoryPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/search" 
                  element={
                    <ProtectedRoute>
                      <SearchPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/categories" 
                  element={
                    <ProtectedRoute>
                      <CategoriesPage />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </AnimatePresence>
          </div>
        </MealProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
