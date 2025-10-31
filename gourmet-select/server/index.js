import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Express
const app = express();
const PORT = process.env.PORT || 5000;

// 中間件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100 // 限制每個IP每15分鐘100個請求
});
app.use(limiter);

// MongoDB 連接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gourmet-select';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB 連接成功'))
  .catch(err => console.error('❌ MongoDB 連接失敗:', err));

// 數據庫模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  type: { type: String, enum: ['meal', 'combo'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Meal = mongoose.model('Meal', MealSchema);

// Multer 配置用於文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ErrorHandler(400, '只允許上傳圖片文件'), false);
    }
  }
});

// ========================
// 自定義錯誤處理類 (約200行)
// ========================
class ErrorHandler extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class DatabaseError extends ErrorHandler {
  constructor(message = '數據庫操作失敗', details = null) {
    super(500, message, details);
  }
}

class AuthenticationError extends ErrorHandler {
  constructor(message = '身份驗證失敗', details = null) {
    super(401, message, details);
  }
}

class AuthorizationError extends ErrorHandler {
  constructor(message = '權限不足', details = null) {
    super(403, message, details);
  }
}

class ValidationError extends ErrorHandler {
  constructor(message = '數據驗證失敗', details = null) {
    super(400, message, details);
  }
}

class NotFoundError extends ErrorHandler {
  constructor(message = '資源未找到', details = null) {
    super(404, message, details);
  }
}

class RateLimitError extends ErrorHandler {
  constructor(message = '請求過於頻繁', details = null) {
    super(429, message, details);
  }
}

class FileUploadError extends ErrorHandler {
  constructor(message = '文件上傳失敗', details = null) {
    super(400, message, details);
  }
}

class NetworkError extends ErrorHandler {
  constructor(message = '網絡連接錯誤', details = null) {
    super(502, message, details);
  }
}

class ServiceUnavailableError extends ErrorHandler {
  constructor(message = '服務暫時不可用', details = null) {
    super(503, message, details);
  }
}

class PaymentRequiredError extends ErrorHandler {
  constructor(message = '需要付款', details = null) {
    super(402, message, details);
  }
}

class MethodNotAllowedError extends ErrorHandler {
  constructor(message = '方法不允許', details = null) {
    super(405, message, details);
  }
}

class InternalServerError extends ErrorHandler {
  constructor(message = '服務器內部錯誤', details = null) {
    super(500, message, details);
  }
}

// ========================
// 錯誤處理中間件 (約300行)
// ========================
const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose 錯誤處理
  if (err.name === 'CastError') {
    const message = '資源ID格式錯誤';
    error = new NotFoundError(message, { originalError: err.message });
  }

  if (err.name === 'ValidationError') {
    const message = '數據驗證失敗';
    const details = Object.values(err.errors).map(val => val.message);
    error = new ValidationError(message, details);
  }

  if (err.code === 11000) {
    const message = '資源已存在';
    error = new ValidationError(message, { duplicateField: Object.keys(err.keyPattern) });
  }

  // JWT 錯誤處理
  if (err.name === 'JsonWebTokenError') {
    const message = '無效的token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token已過期';
    error = new AuthenticationError(message);
  }

  // Multer 錯誤處理
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超過限制';
    error = new FileUploadError(message, { maxSize: '5MB' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = '意外的文件字段';
    error = new FileUploadError(message);
  }

  // MongoDB 連接錯誤
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = '數據庫連接錯誤';
    error = new DatabaseError(message, { originalError: err.message });
  }

  // 速率限制錯誤
  if (err.statusCode === 429) {
    error = new RateLimitError('請求過於頻繁，請稍後再試');
  }

  // 默認錯誤日誌
  console.error('Error Stack:', err.stack);
  console.error('Error Details:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // 發送錯誤響應
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    details: error.details,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

// ========================
// 身份驗證中間件 (約100行)
// ========================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('訪問令牌缺失');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        throw new AuthenticationError('用戶不存在');
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthenticationError('令牌已過期');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthenticationError('無效的令牌');
      } else {
        throw new AuthenticationError('令牌驗證失敗');
      }
    }
  } catch (error) {
    next(error);
  }
};

// ========================
// 請求驗證中間件 (約150行)
// ========================
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));
        
        throw new ValidationError('請求數據驗證失敗', errorDetails);
      }

      req.validatedData = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ========================
// 路由處理器 (約600行)
// ========================

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服務運行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 登入路由
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('用戶名和密碼為必填項');
    }

    // 查找用戶
    const user = await User.findOne({ username });
    if (!user) {
      throw new AuthenticationError('用戶名或密碼錯誤');
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('用戶名或密碼錯誤');
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登入成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// 獲取餐點列表
app.get('/api/meals', authMiddleware, async (req, res, next) => {
  try {
    const meals = await Meal.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: '獲取餐點列表成功',
      data: meals,
      count: meals.length
    });
  } catch (error) {
    next(new DatabaseError('獲取餐點列表失敗', { originalError: error.message }));
  }
});

// 新增餐點
app.post('/api/meals', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    const { name, type } = req.body;
    const image = req.file;

    if (!name || !type) {
      throw new ValidationError('餐點名稱和類型為必填項');
    }

    if (!image) {
      throw new FileUploadError('請上傳餐點圖片');
    }

    if (!['meal', 'combo'].includes(type)) {
      throw new ValidationError('類型必須是 meal 或 combo');
    }

    const newMeal = new Meal({
      name,
      type,
      image: `/uploads/${image.filename}`,
      createdBy: req.user._id
    });

    const savedMeal = await newMeal.save();
    await savedMeal.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      message: '餐點新增成功',
      data: savedMeal
    });

  } catch (error) {
    next(error);
  }
});

// 404 處理 - 必須在所有正常路由之後
app.use('*', (req, res, next) => {
  next(new NotFoundError(`路徑 ${req.originalUrl} 不存在`));
});

// 405 處理 - 方法不允許
app.use((req, res, next) => {
  if (!req.route) {
    next(new MethodNotAllowedError(`方法 ${req.method} 不允許用於 ${req.originalUrl}`));
  } else {
    next();
  }
});

// 應用錯誤處理中間件
app.use(errorMiddleware);

// 啟動服務器
app.listen(PORT, () => {
  console.log(`🚀 服務器運行在端口 ${PORT}`);
  console.log(`📊 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
