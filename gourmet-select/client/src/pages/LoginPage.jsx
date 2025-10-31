import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogIn, Utensils, Star, Clock, Users } from 'lucide-react'

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    // 模擬登入過程
    setTimeout(() => {
      localStorage.setItem('token', 'demo-token')
      navigate('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景裝飾元素 */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight 
            }}
            animate={{
              y: [null, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* 左上角登入按鈕 */}
      <motion.button
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 btn-primary z-10"
        onClick={() => document.getElementById('login-form').scrollIntoView()}
      >
        <LogIn className="w-4 h-4 mr-2" />
        立即登入
      </motion.button>

      {/* 主內容 */}
      <div className="container mx-auto px-6 py-12">
        {/* 英雄區域 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center"
          >
            <Utensils className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-6xl font-bold text-white mb-4">
            Gourmet <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Select</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            探索無限美食可能，打造專屬您的用餐體驗。精選餐點，個性化推薦，盡在指尖。
          </p>
        </motion.div>

        {/* 特色卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: Star, title: '精選餐點', desc: '嚴選優質食材，專業廚師團隊' },
            { icon: Clock, title: '快速配送', desc: '30分鐘內熱騰騰送達' },
            { icon: Users, title: '個性推薦', desc: '根據喜好智能推薦餐點' },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="glass-effect rounded-2xl p-6 text-center card-hover"
            >
              <item.icon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* 登入表單 */}
        <motion.div
          id="login-form"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto glass-effect rounded-3xl p-8"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">歡迎回來</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                用戶名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder="請輸入用戶名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                密碼
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder="請輸入密碼"
                required
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  登入中...
                </div>
              ) : (
                '登入系統'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage
