import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Utensils, Coffee, LogOut, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DashboardPage = () => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMeal, setNewMeal] = useState({ name: '', type: 'meal', image: null })
  const [meals, setMeals] = useState([])
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleAddMeal = (e) => {
    e.preventDefault()
    if (newMeal.name && newMeal.image) {
      const meal = {
        id: Date.now(),
        ...newMeal,
        createdAt: new Date().toISOString()
      }
      setMeals([meal, ...meals])
      setNewMeal({ name: '', type: 'meal', image: null })
      setShowAddForm(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewMeal(prev => ({ ...prev, image: e.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* 登出按鈕 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleLogout}
        className="absolute top-6 right-6 btn-secondary"
      >
        <LogOut className="w-4 h-4 mr-2" />
        登出
      </motion.button>

      {/* 主標題 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">我的餐點選擇</h1>
        <p className="text-gray-300">管理您的專屬餐點收藏</p>
      </motion.div>

      {/* 餐點網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <AnimatePresence>
          {meals.map((meal, index) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-2xl overflow-hidden card-hover"
            >
              <img 
                src={meal.image} 
                alt={meal.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{meal.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    meal.type === 'meal' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {meal.type === 'meal' ? '餐點' : '套餐'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  新增於 {new Date(meal.createdAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 左下角新增按鈕 */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg z-50"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* 新增餐點表單 Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">新增餐點</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddMeal} className="space-y-4">
                {/* 圖片上傳 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    餐點圖片
                  </label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                    {newMeal.image ? (
                      <img 
                        src={newMeal.image} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    ) : (
                      <div className="py-8">
                        <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400">點擊上傳圖片</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 餐點名稱 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    餐點名稱
                  </label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="輸入餐點名稱"
                    required
                  />
                </div>

                {/* 類型選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    類型
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {['meal', 'combo'].map((type) => (
                      <label
                        key={type}
                        className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          newMeal.type === type
                            ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                            : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={newMeal.type === type}
                          onChange={(e) => setNewMeal(prev => ({ ...prev, type: e.target.value }))}
                          className="hidden"
                        />
                        <div className="flex items-center">
                          {type === 'meal' ? (
                            <Utensils className="w-4 h-4 mr-2" />
                          ) : (
                            <Coffee className="w-4 h-4 mr-2" />
                          )}
                          <span className="text-white">
                            {type === 'meal' ? '單點餐點' : '套餐'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 提交按鈕 */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary mt-6"
                >
                  新增餐點
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardPage
