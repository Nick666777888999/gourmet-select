import React, { createContext, useState, useContext } from 'react'
import { mealService } from '../services/mealService'
import { useNotification } from '../hooks/useNotification'

const MealContext = createContext()

export const useMeal = () => {
  const context = useContext(MealContext)
  if (!context) {
    throw new Error('useMeal must be used within a MealProvider')
  }
  return context
}

export const MealProvider = ({ children }) => {
  const [meals, setMeals] = useState([])
  const [featuredMeals, setFeaturedMeals] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const { showNotification } = useNotification()

  const fetchMeals = async (filters = {}) => {
    try {
      setIsLoading(true)
      const response = await mealService.getMeals(filters)
      setMeals(response.data)
      return response
    } catch (error) {
      showNotification('獲取餐點列表失敗', 'error')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeaturedMeals = async () => {
    try {
      const response = await mealService.getPopularMeals({ limit: 8 })
      setFeaturedMeals(response.data.meals)
    } catch (error) {
      console.error('Failed to fetch featured meals:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await mealService.getCategoryStats()
      setCategories(response.data.stats)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const addMeal = async (mealData) => {
    try {
      const formData = new FormData()
      
      // 添加基本字段
      Object.keys(mealData).forEach(key => {
        if (key === 'image' && mealData[key] instanceof File) {
          formData.append('image', mealData[key])
        } else if (key === 'additionalImages' && Array.isArray(mealData[key])) {
          mealData[key].forEach(file => {
            formData.append('additionalImages', file)
          })
        } else if (typeof mealData[key] === 'object') {
          formData.append(key, JSON.stringify(mealData[key]))
        } else {
          formData.append(key, mealData[key])
        }
      })

      const response = await mealService.createMeal(formData)
      setMeals(prev => [response.data.meal, ...prev])
      showNotification('餐點新增成功', 'success')
      return response
    } catch (error) {
      showNotification(error.response?.data?.message || '新增餐點失敗', 'error')
      throw error
    }
  }

  const updateMeal = async (id, mealData) => {
    try {
      const formData = new FormData()
      
      Object.keys(mealData).forEach(key => {
        if (key === 'image' && mealData[key] instanceof File) {
          formData.append('image', mealData[key])
        } else if (key === 'additionalImages' && Array.isArray(mealData[key])) {
          mealData[key].forEach(file => {
            formData.append('additionalImages', file)
          })
        } else if (typeof mealData[key] === 'object') {
          formData.append(key, JSON.stringify(mealData[key]))
        } else {
          formData.append(key, mealData[key])
        }
      })

      const response = await mealService.updateMeal(id, formData)
      setMeals(prev => prev.map(meal => 
        meal._id === id ? response.data.meal : meal
      ))
      showNotification('餐點更新成功', 'success')
      return response
    } catch (error) {
      showNotification(error.response?.data?.message || '更新餐點失敗', 'error')
      throw error
    }
  }

  const deleteMeal = async (id) => {
    try {
      await mealService.deleteMeal(id)
      setMeals(prev => prev.filter(meal => meal._id !== id))
      showNotification('餐點刪除成功', 'success')
    } catch (error) {
      showNotification(error.response?.data?.message || '刪除餐點失敗', 'error')
      throw error
    }
  }

  const searchMeals = async (query) => {
    try {
      const response = await mealService.searchMeals(query)
      return response.data
    } catch (error) {
      showNotification('搜索失敗', 'error')
      throw error
    }
  }

  const value = {
    meals,
    featuredMeals,
    categories,
    isLoading,
    fetchMeals,
    fetchFeaturedMeals,
    fetchCategories,
    addMeal,
    updateMeal,
    deleteMeal,
    searchMeals
  }

  return (
    <MealContext.Provider value={value}>
      {children}
    </MealContext.Provider>
  )
}
