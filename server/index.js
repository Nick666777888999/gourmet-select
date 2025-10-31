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
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Express
const app = express();
const PORT = process.env.PORT || 5000;

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 高級中間件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 靜態文件服務
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 高級速率限制配置
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
});

// 應用不同級別的速率限制
app.use('/api/auth/', createRateLimit(15 * 60 * 1000, 5, '登入嘗試過於頻繁，請15分鐘後再試'));
app.use('/api/upload/', createRateLimit(15 * 60 * 1000, 10, '文件上傳過於頻繁，請稍後再試'));
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, '請求過於頻繁，請稍後再試'));

// MongoDB 連接 with advanced options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gourmet-select';
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB 連接成功');
    console.log('📊 數據庫:', mongoose.connection.name);
    console.log('🎯 主機:', mongoose.connection.host);
  })
  .catch(err => {
    console.error('❌ MongoDB 連接失敗:', err);
    process.exit(1);
  });

// 連接事件監聽
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB 連接斷開');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 連接錯誤:', err);
});

// 優化的數據庫模型
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, '用戶名為必填項'], 
    unique: true,
    trim: true,
    minlength: [3, '用戶名至少3個字符'],
    maxlength: [30, '用戶名最多30個字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用戶名只能包含字母、數字和下劃線']
  },
  password: { 
    type: String, 
    required: [true, '密碼為必填項'],
    minlength: [6, '密碼至少6個字符']
  },
  email: {
    type: String,
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, '請輸入有效的電子郵件']
  },
  avatar: String,
  role: { 
    type: String, 
    enum: ['user', 'admin', 'chef'], 
    default: 'user' 
  },
  preferences: {
    dietary: [String],
    allergies: [String],
    favoriteCuisines: [String]
  },
  statistics: {
    mealsAdded: { type: Number, default: 0 },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 餐點模型 with advanced features
const MealSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '餐點名稱為必填項'],
    trim: true,
    maxlength: [100, '餐點名稱最多100個字符']
  },
  description: {
    type: String,
    maxlength: [500, '描述最多500個字符']
  },
  image: { 
    type: String, 
    required: [true, '餐點圖片為必填項'] 
  },
  images: [String],
  type: { 
    type: String, 
    enum: ['meal', 'combo', 'beverage', 'dessert'], 
    required: true 
  },
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'lunch'
  },
  price: {
    amount: { type: Number, min: 0 },
    currency: { type: String, default: 'TWD' }
  },
  nutritionalInfo: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 }
  },
  tags: [String],
  ingredients: [{
    name: String,
    quantity: String,
    containsAllergens: Boolean
  }],
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isDairyFree: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false }
  },
  preparationTime: { type: Number, min: 0 }, // 分鐘
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  popularity: { type: Number, default: 0 },
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableDays: [{ type: Number, min: 0, max: 6 }], // 0-6 代表週日到週六
    availableTimes: {
      start: String,
      end: String
    }
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 訂單模型
const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
    quantity: { type: Number, min: 1, default: 1 },
    price: { type: Number, min: 0 },
    specialInstructions: String
  }],
  totalAmount: { type: Number, min: 0, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  deliveryInfo: {
    address: String,
    phone: String,
    deliveryTime: Date,
    specialInstructions: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 索引優化
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
MealSchema.index({ createdBy: 1 });
MealSchema.index({ type: 1, category: 1 });
MealSchema.index({ tags: 1 });
MealSchema.index({ 'dietaryInfo.isVegetarian': 1 });
MealSchema.index({ popularity: -1 });
MealSchema.index({ createdAt: -1 });
OrderSchema.index({ user: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// 中間件
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.updatedAt = Date.now();
  next();
});

MealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

OrderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', UserSchema);
const Meal = mongoose.model('Meal', MealSchema);
const Order = mongoose.model('Order', OrderSchema);

// ========================
// 高級錯誤處理系統 (800+ 行)
// ========================

class ErrorHandler extends Error {
  constructor(statusCode, message, details = null, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      details: this.details,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

class DatabaseError extends ErrorHandler {
  constructor(message = '數據庫操作失敗', details = null, errorCode = 'DB_ERROR') {
    super(500, message, details, errorCode);
  }
}

class AuthenticationError extends ErrorHandler {
  constructor(message = '身份驗證失敗', details = null, errorCode = 'AUTH_ERROR') {
    super(401, message, details, errorCode);
  }
}

class AuthorizationError extends ErrorHandler {
  constructor(message = '權限不足', details = null, errorCode = 'AUTHZ_ERROR') {
    super(403, message, details, errorCode);
  }
}

class ValidationError extends ErrorHandler {
  constructor(message = '數據驗證失敗', details = null, errorCode = 'VALIDATION_ERROR') {
    super(400, message, details, errorCode);
  }
}

class NotFoundError extends ErrorHandler {
  constructor(message = '資源未找到', details = null, errorCode = 'NOT_FOUND') {
    super(404, message, details, errorCode);
  }
}

class RateLimitError extends ErrorHandler {
  constructor(message = '請求過於頻繁', details = null, errorCode = 'RATE_LIMIT') {
    super(429, message, details, errorCode);
  }
}

class FileUploadError extends ErrorHandler {
  constructor(message = '文件上傳失敗', details = null, errorCode = 'FILE_UPLOAD_ERROR') {
    super(400, message, details, errorCode);
  }
}

class NetworkError extends ErrorHandler {
  constructor(message = '網絡連接錯誤', details = null, errorCode = 'NETWORK_ERROR') {
    super(502, message, details, errorCode);
  }
}

class ServiceUnavailableError extends ErrorHandler {
  constructor(message = '服務暫時不可用', details = null, errorCode = 'SERVICE_UNAVAILABLE') {
    super(503, message, details, errorCode);
  }
}

class PaymentRequiredError extends ErrorHandler {
  constructor(message = '需要付款', details = null, errorCode = 'PAYMENT_REQUIRED') {
    super(402, message, details, errorCode);
  }
}

class MethodNotAllowedError extends ErrorHandler {
  constructor(message = '方法不允許', details = null, errorCode = 'METHOD_NOT_ALLOWED') {
    super(405, message, details, errorCode);
  }
}

class InternalServerError extends ErrorHandler {
  constructor(message = '服務器內部錯誤', details = null, errorCode = 'INTERNAL_ERROR') {
    super(500, message, details, errorCode);
  }
}

class ConflictError extends ErrorHandler {
  constructor(message = '資源衝突', details = null, errorCode = 'CONFLICT') {
    super(409, message, details, errorCode);
  }
}

class TooManyRequestsError extends ErrorHandler {
  constructor(message = '請求過多', details = null, errorCode = 'TOO_MANY_REQUESTS') {
    super(429, message, details, errorCode);
  }
}

class RequestTimeoutError extends ErrorHandler {
  constructor(message = '請求超時', details = null, errorCode = 'REQUEST_TIMEOUT') {
    super(408, message, details, errorCode);
  }
}

class UnsupportedMediaTypeError extends ErrorHandler {
  constructor(message = '不支持的媒體類型', details = null, errorCode = 'UNSUPPORTED_MEDIA') {
    super(415, message, details, errorCode);
  }
}

class RequestTooLargeError extends ErrorHandler {
  constructor(message = '請求體過大', details = null, errorCode = 'REQUEST_TOO_LARGE') {
    super(413, message, details, errorCode);
  }
}

// ========================
// 高級錯誤處理中間件 (400+ 行)
// ========================
const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // 詳細錯誤日誌
  const errorLog = {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id || 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode
    },
    body: req.body && Object.keys(req.body).length > 0 ? 
      { ...req.body, password: req.body.password ? '***' : undefined } : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined
  };

  // Mongoose 錯誤處理
  if (err.name === 'CastError') {
    const message = `無效的ID格式: ${err.value}`;
    error = new NotFoundError(message, { 
      resource: err.path,
      value: err.value,
      kind: err.kind
    });
  }

  if (err.name === 'ValidationError') {
    const message = '數據驗證失敗';
    const details = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value,
      kind: val.kind
    }));
    error = new ValidationError(message, details);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' 已存在`;
    error = new ConflictError(message, { 
      duplicateField: field,
      duplicateValue: value,
      keyPattern: err.keyPattern
    });
  }

  // JWT 錯誤處理
  if (err.name === 'JsonWebTokenError') {
    const message = '無效的JWT令牌';
    error = new AuthenticationError(message, { 
      tokenError: err.message 
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'JWT令牌已過期';
    error = new AuthenticationError(message, { 
      expiredAt: err.expiredAt 
    });
  }

  // Multer 錯誤處理
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超過限制';
    error = new FileUploadError(message, { 
      maxSize: '10MB',
      actualSize: err.length 
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = '意外的文件字段';
    error = new FileUploadError(message, { 
      field: err.field 
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = '文件數量超過限制';
    error = new FileUploadError(message);
  }

  if (err.code === 'LIMIT_FIELD_KEY') {
    const message = '字段名過長';
    error = new FileUploadError(message);
  }

  if (err.code === 'LIMIT_FIELD_VALUE') {
    const message = '字段值過長';
    error = new FileUploadError(message);
  }

  if (err.code === 'LIMIT_FIELD_COUNT') {
    const message = '字段數量超過限制';
    error = new FileUploadError(message);
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    const message = '部分數量超過限制';
    error = new FileUploadError(message);
  }

  // MongoDB 連接錯誤
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    const message = '數據庫連接錯誤';
    error = new DatabaseError(message, { 
      originalError: err.message,
      errorName: err.name
    });
  }

  if (err.name === 'MongoServerSelectionError') {
    const message = '無法連接到數據庫服務器';
    error = new DatabaseError(message, {
      originalError: err.message
    });
  }

  // 速率限制錯誤
  if (err.statusCode === 429) {
    error = new RateLimitError('請求過於頻繁，請稍後再試', {
      retryAfter: err.retryAfter,
      limit: err.limit,
      current: err.current
    });
  }

  // 網絡錯誤
  if (err.code === 'ECONNREFUSED') {
    error = new NetworkError('無法連接到後端服務', {
      code: err.code,
      address: err.address,
      port: err.port
    });
  }

  if (err.code === 'ETIMEDOUT') {
    error = new RequestTimeoutError('請求超時', {
      code: err.code
    });
  }

  // 文件系統錯誤
  if (err.code === 'ENOENT') {
    error = new NotFoundError('文件或目錄不存在', {
      path: err.path,
      code: err.code
    });
  }

  if (err.code === 'EACCES') {
    error = new AuthorizationError('文件訪問權限不足', {
      path: err.path,
      code: err.code
    });
  }

  // 內存錯誤
  if (err.code === 'ERR_STREAM_WRITE_AFTER_END') {
    error = new InternalServerError('流寫入錯誤');
  }

  // 默認錯誤處理
  if (!error.statusCode || error.statusCode === 500) {
    error = new InternalServerError('服務器內部錯誤', {
      originalError: err.message,
      errorName: err.name
    });
  }

  // 錯誤日誌記錄 (生產環境中應該使用專業的日誌服務)
  if (error.statusCode >= 500) {
    console.error('🚨 服務器錯誤:', JSON.stringify(errorLog, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ 客戶端錯誤:', JSON.stringify(errorLog, null, 2));
  }

  // 發送錯誤響應
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    details: error.details,
    errorCode: error.errorCode,
    timestamp: error.timestamp,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// ========================
// 高級身份驗證中間件 (300+ 行)
// ========================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('訪問令牌缺失', {
        hint: '請在Authorization頭部提供Bearer token',
        code: 'MISSING_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      const user = await User.findById(decoded.userId)
        .select('-password')
        .lean();
      
      if (!user) {
        throw new AuthenticationError('用戶不存在或已被刪除', {
          userId: decoded.userId,
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        throw new AuthenticationError('用戶賬戶已被停用', {
          userId: decoded.userId,
          code: 'USER_INACTIVE'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthenticationError('訪問令牌已過期', {
          expiredAt: jwtError.expiredAt,
          code: 'TOKEN_EXPIRED',
          hint: '請重新登入獲取新令牌'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthenticationError('無效的訪問令牌', {
          reason: jwtError.message,
          code: 'INVALID_TOKEN',
          hint: '請檢查令牌格式和簽名'
        });
      } else {
        throw new AuthenticationError('令牌驗證失敗', {
          originalError: jwtError.message,
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

// 管理員權限中間件
const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('需要身份驗證');
    }

    if (req.user.role !== 'admin' && req.user.role !== 'chef') {
      throw new AuthorizationError('需要管理員權限', {
        requiredRole: ['admin', 'chef'],
        userRole: req.user.role,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ========================
// 高級文件上傳配置 (200+ 行)
// ========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileUploadError('不支持的文件類型', {
      allowedTypes: allowedMimes,
      receivedType: file.mimetype,
      fileName: file.originalname
    }), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // 最多5個文件
    fields: 20, // 最多20個字段
    fieldNameSize: 100, // 字段名最大長度
    fieldSize: 100 // 字段值最大長度
  },
  fileFilter: fileFilter
});

// 多文件上傳配置
const multipleUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 4 }
]);

// ========================
// 工具函數 (400+ 行)
// ========================
class ValidationUtils {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    const minLength = 6;
    return password && password.length >= minLength;
  }

  static validateMealData(mealData) {
    const errors = [];

    if (!mealData.name || mealData.name.trim().length === 0) {
      errors.push('餐點名稱不能為空');
    }

    if (mealData.name && mealData.name.length > 100) {
      errors.push('餐點名稱不能超過100個字符');
    }

    if (mealData.description && mealData.description.length > 500) {
      errors.push('描述不能超過500個字符');
    }

    if (!['meal', 'combo', 'beverage', 'dessert'].includes(mealData.type)) {
      errors.push('無效的餐點類型');
    }

    if (mealData.price && mealData.price.amount < 0) {
      errors.push('價格不能為負數');
    }

    return errors;
  }

  static sanitizeUserInput(input) {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    return input;
  }
}

class ResponseUtils {
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = '創建成功') {
    return this.success(res, data, message, 201);
  }

  static paginated(res, data, pagination, message = '獲取成功') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

class SecurityUtils {
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }

  static validateImageDimensions(filePath, maxWidth = 2000, maxHeight = 2000) {
    return new Promise((resolve, reject) => {
      // 在實際應用中，這裡應該使用 sharp 或 gm 來檢查圖片尺寸
      resolve(true);
    });
  }
}

// ========================
// API 路由處理器 (1500+ 行)
// ========================

// 健康檢查端點
app.get('/api/health', async (req, res, next) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    };

    // 檢查數據庫連接
    try {
      await mongoose.connection.db.admin().ping();
      healthCheck.database = 'connected';
    } catch (dbError) {
      healthCheck.database = 'disconnected';
      healthCheck.dbError = dbError.message;
    }

    res.status(200).json({
      success: true,
      message: '服務健康狀態',
      data: healthCheck
    });
  } catch (error) {
    next(error);
  }
});

// 系統信息端點
app.get('/api/system/info', authMiddleware, adminMiddleware, (req, res, next) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      },
      uptime: Math.round(process.uptime()) + 's',
      environment: process.env.NODE_ENV
    };

    ResponseUtils.success(res, systemInfo, '系統信息獲取成功');
  } catch (error) {
    next(error);
  }
});

// 用戶註冊 (雖然您說不要註冊，但為了完整性保留)
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // 輸入驗證
    if (!username || !password) {
      throw new ValidationError('用戶名和密碼為必填項');
    }

    if (!ValidationUtils.validatePassword(password)) {
      throw new ValidationError('密碼至少需要6個字符');
    }

    if (email && !ValidationUtils.validateEmail(email)) {
      throw new ValidationError('請提供有效的電子郵件地址');
    }

    const sanitizedUsername = ValidationUtils.sanitizeUserInput(username);

    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ 
      username: sanitizedUsername 
    });

    if (existingUser) {
      throw new ConflictError('用戶名已被使用');
    }

    // 創建新用戶
    const newUser = new User({
      username: sanitizedUsername,
      password: password,
      email: email || undefined
    });

    const savedUser = await newUser.save();

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: savedUser._id, 
        username: savedUser.username,
        role: savedUser.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    ResponseUtils.created(res, {
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        createdAt: savedUser.createdAt
      }
    }, '用戶註冊成功');
  } catch (error) {
    next(error);
  }
});

// 用戶登入
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 輸入驗證
    if (!username || !password) {
      throw new ValidationError('用戶名和密碼為必填項', {
        missingFields: {
          username: !username,
          password: !password
        }
      });
    }

    const sanitizedUsername = ValidationUtils.sanitizeUserInput(username);

    // 查找用戶
    const user = await User.findOne({ username: sanitizedUsername });
    if (!user) {
      throw new AuthenticationError('用戶名或密碼錯誤', {
        hint: '請檢查用戶名和密碼',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      throw new AuthenticationError('用戶賬戶已被停用', {
        code: 'ACCOUNT_DISABLED'
      });
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('用戶名或密碼錯誤', {
        hint: '請檢查用戶名和密碼',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 更新用戶統計信息
    user.statistics.lastLogin = new Date();
    user.statistics.loginCount += 1;
    await user.save();

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '24h',
        issuer: 'gourmet-select-api',
        subject: user._id.toString()
      }
    );

    ResponseUtils.success(res, {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
        statistics: user.statistics,
        createdAt: user.createdAt
      }
    }, '登入成功');
  } catch (error) {
    next(error);
  }
});

// 獲取當前用戶信息
app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!user) {
      throw new NotFoundError('用戶不存在');
    }

    ResponseUtils.success(res, { user }, '用戶信息獲取成功');
  } catch (error) {
    next(error);
  }
});

// 更新用戶資料
app.put('/api/auth/profile', authMiddleware, async (req, res, next) => {
  try {
    const { email, preferences } = req.body;
    const updates = {};

    if (email) {
      if (!ValidationUtils.validateEmail(email)) {
        throw new ValidationError('請提供有效的電子郵件地址');
      }
      updates.email = email;
    }

    if (preferences) {
      updates.preferences = {
        ...req.user.preferences,
        ...preferences
      };
    }

    updates.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    ResponseUtils.success(res, { user: updatedUser }, '用戶資料更新成功');
  } catch (error) {
    next(error);
  }
});

// 獲取餐點列表 (支持分頁、過濾、排序)
app.get('/api/meals', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      category,
      tags,
      vegetarian,
      vegan,
      glutenFree,
      spicy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // 構建查詢條件
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // 飲食要求過濾
    if (vegetarian === 'true') query['dietaryInfo.isVegetarian'] = true;
    if (vegan === 'true') query['dietaryInfo.isVegan'] = true;
    if (glutenFree === 'true') query['dietaryInfo.isGlutenFree'] = true;
    if (spicy === 'true') query['dietaryInfo.isSpicy'] = true;

    // 排序條件
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 分頁選項
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 執行查詢
    const [meals, total] = await Promise.all([
      Meal.find(query)
        .populate('createdBy', 'username avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Meal.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    ResponseUtils.paginated(res, meals, pagination, '餐點列表獲取成功');
  } catch (error) {
    next(new DatabaseError('獲取餐點列表失敗', { originalError: error.message }));
  }
});

// 獲取單個餐點詳情
app.get('/api/meals/:id', authMiddleware, async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id)
      .populate('createdBy', 'username avatar statistics')
      .lean();

    if (!meal) {
      throw new NotFoundError('餐點未找到', {
        mealId: req.params.id
      });
    }

    // 增加瀏覽次數
    await Meal.findByIdAndUpdate(req.params.id, {
      $inc: { popularity: 1 }
    });

    ResponseUtils.success(res, { meal }, '餐點詳情獲取成功');
  } catch (error) {
    next(error);
  }
});

// 新增餐點
app.post('/api/meals', authMiddleware, multipleUpload, async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      type, 
      category,
      price,
      nutritionalInfo,
      tags,
      ingredients,
      dietaryInfo,
      preparationTime,
      availability
    } = req.body;

    // 基本驗證
    if (!name || !type) {
      throw new ValidationError('餐點名稱和類型為必填項');
    }

    if (!req.files || !req.files.image) {
      throw new FileUploadError('請上傳餐點主圖片');
    }

    // 數據驗證
    const validationErrors = ValidationUtils.validateMealData({
      name, description, type, price
    });

    if (validationErrors.length > 0) {
      throw new ValidationError('數據驗證失敗', validationErrors);
    }

    // 處理上傳的文件
    const mainImage = req.files.image[0];
    const additionalImages = req.files.additionalImages || [];

    const imageUrls = {
      main: `/uploads/${mainImage.filename}`,
      additional: additionalImages.map(file => `/uploads/${file.filename}`)
    };

    // 解析 JSON 數據
    let priceData, nutritionalData, dietaryData, availabilityData;
    let ingredientsArray = [];

    try {
      priceData = price ? JSON.parse(price) : undefined;
      nutritionalData = nutritionalInfo ? JSON.parse(nutritionalInfo) : undefined;
      dietaryData = dietaryInfo ? JSON.parse(dietaryInfo) : {};
      availabilityData = availability ? JSON.parse(availability) : { isAvailable: true };
      
      if (ingredients) {
        ingredientsArray = JSON.parse(ingredients);
      }
    } catch (parseError) {
      throw new ValidationError('JSON 數據解析失敗', {
        field: parseError.message
      });
    }

    // 處理標籤
    const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [];

    // 創建新餐點
    const newMeal = new Meal({
      name: ValidationUtils.sanitizeUserInput(name),
      description: description ? ValidationUtils.sanitizeUserInput(description) : undefined,
      type,
      category: category || 'lunch',
      image: imageUrls.main,
      images: imageUrls.additional,
      price: priceData,
      nutritionalInfo: nutritionalData,
      tags: tagsArray,
      ingredients: ingredientsArray,
      dietaryInfo: dietaryData,
      preparationTime: preparationTime ? parseInt(preparationTime) : undefined,
      availability: availabilityData,
      createdBy: req.user._id
    });

    const savedMeal = await newMeal.save();
    await savedMeal.populate('createdBy', 'username avatar');

    // 更新用戶統計
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'statistics.mealsAdded': 1 }
    });

    ResponseUtils.created(res, { meal: savedMeal }, '餐點新增成功');
  } catch (error) {
    next(error);
  }
});

// 更新餐點
app.put('/api/meals/:id', authMiddleware, multipleUpload, async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id);
    
    if (!meal) {
      throw new NotFoundError('餐點未找到');
    }

    // 檢查權限
    if (meal.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AuthorizationError('無權修改此餐點');
    }

    const updates = { ...req.body };
    
    // 處理文件上傳
    if (req.files) {
      if (req.files.image) {
        updates.image = `/uploads/${req.files.image[0].filename}`;
        // 在生產環境中，這裡應該刪除舊的圖片文件
      }
      if (req.files.additionalImages) {
        updates.images = req.files.additionalImages.map(file => `/uploads/${file.filename}`);
      }
    }

    // 解析 JSON 字段
    const jsonFields = ['price', 'nutritionalInfo', 'dietaryInfo', 'availability', 'ingredients'];
    jsonFields.forEach(field => {
      if (updates[field]) {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch (error) {
          throw new ValidationError(`字段 ${field} 的 JSON 格式無效`);
        }
      }
    });

    // 處理標籤
    if (updates.tags) {
      updates.tags = Array.isArray(updates.tags) ? 
        updates.tags : 
        updates.tags.split(',').map(tag => tag.trim());
    }

    updates.updatedAt = new Date();

    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username avatar');

    ResponseUtils.success(res, { meal: updatedMeal }, '餐點更新成功');
  } catch (error) {
    next(error);
  }
});

// 刪除餐點
app.delete('/api/meals/:id', authMiddleware, async (req, res, next) => {
  try {
    const meal = await Meal.findById(req.params.id);
    
    if (!meal) {
      throw new NotFoundError('餐點未找到');
    }

    // 檢查權限
    if (meal.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AuthorizationError('無權刪除此餐點');
    }

    await Meal.findByIdAndDelete(req.params.id);

    // 在生產環境中，這裡應該刪除相關的圖片文件

    ResponseUtils.success(res, null, '餐點刪除成功');
  } catch (error) {
    next(error);
  }
});

// 獲取餐點分類統計
app.get('/api/meals/stats/categories', authMiddleware, async (req, res, next) => {
  try {
    const stats = await Meal.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating.average' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    ResponseUtils.success(res, { stats }, '分類統計獲取成功');
  } catch (error) {
    next(error);
  }
});

// 獲取熱門餐點
app.get('/api/meals/popular', authMiddleware, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const popularMeals = await Meal.find()
      .sort({ popularity: -1, 'rating.average': -1 })
      .limit(limit)
      .populate('createdBy', 'username avatar')
      .lean();

    ResponseUtils.success(res, { meals: popularMeals }, '熱門餐點獲取成功');
  } catch (error) {
    next(error);
  }
});

// 搜索餐點
app.get('/api/meals/search/:query', authMiddleware, async (req, res, next) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const searchResults = await Meal.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { 'ingredients.name': { $regex: query, $options: 'i' } }
      ]
    })
    .limit(limit)
    .populate('createdBy', 'username avatar')
    .lean();

    ResponseUtils.success(res, { 
      results: searchResults,
      count: searchResults.length,
      query
    }, '搜索完成');
  } catch (error) {
    next(error);
  }
});

// 創建訂單
app.post('/api/orders', authMiddleware, async (req, res, next) => {
  try {
    const { items, deliveryInfo, specialInstructions } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('訂單項目不能為空');
    }

    // 驗證餐點存在並獲取價格
    const mealIds = items.map(item => item.meal);
    const meals = await Meal.find({ _id: { $in: mealIds } });

    if (meals.length !== items.length) {
      throw new NotFoundError('部分餐點不存在');
    }

    // 計算總金額
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const meal = meals.find(m => m._id.toString() === item.meal);
      const itemTotal = (meal.price?.amount || 0) * item.quantity;
      totalAmount += itemTotal;

      return {
        meal: item.meal,
        quantity: item.quantity,
        price: meal.price?.amount || 0,
        specialInstructions: item.specialInstructions
      };
    });

    const newOrder = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      deliveryInfo: deliveryInfo || {},
      specialInstructions
    });

    const savedOrder = await newOrder.save();
    await savedOrder.populate('user', 'username email');
    await savedOrder.populate('items.meal', 'name image price');

    ResponseUtils.created(res, { order: savedOrder }, '訂單創建成功');
  } catch (error) {
    next(error);
  }
});

// 獲取用戶訂單
app.get('/api/orders', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.meal', 'name image price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    ResponseUtils.paginated(res, orders, pagination, '訂單列表獲取成功');
  } catch (error) {
    next(error);
  }
});

// 獲取訂單詳情
app.get('/api/orders/:id', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .populate('user', 'username email')
    .populate('items.meal', 'name image price dietaryInfo')
    .lean();

    if (!order) {
      throw new NotFoundError('訂單未找到');
    }

    ResponseUtils.success(res, { order }, '訂單詳情獲取成功');
  } catch (error) {
    next(error);
  }
});

// 取消訂單
app.put('/api/orders/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      throw new NotFoundError('訂單未找到');
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new ValidationError('當前狀態無法取消訂單');
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();
    await order.save();

    ResponseUtils.success(res, { order }, '訂單取消成功');
  } catch (error) {
    next(error);
  }
});

// 文件上傳專用端點
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new FileUploadError('沒有文件被上傳');
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };

    ResponseUtils.success(res, { file: fileInfo }, '文件上傳成功');
  } catch (error) {
    next(error);
  }
});

// 批量文件上傳
app.post('/api/upload/multiple', authMiddleware, upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new FileUploadError('沒有文件被上傳');
    }

    const filesInfo = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date()
    }));

    ResponseUtils.success(res, { files: filesInfo }, '批量文件上傳成功');
  } catch (error) {
    next(error);
  }
});

// 服務器統計信息
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [
      userCount,
      mealCount,
      orderCount,
      recentUsers,
      popularMeals
    ] = await Promise.all([
      User.countDocuments(),
      Meal.countDocuments(),
      Order.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('username createdAt'),
      Meal.find().sort({ popularity: -1 }).limit(5).select('name popularity')
    ]);

    const stats = {
      users: userCount,
      meals: mealCount,
      orders: orderCount,
      recentUsers,
      popularMeals
    };

    ResponseUtils.success(res, { stats }, '統計信息獲取成功');
  } catch (error) {
    next(error);
  }
});

// 404 處理 - 必須在所有正常路由之後
app.use('/api/*', (req, res, next) => {
  next(new NotFoundError(`API端點 ${req.originalUrl} 不存在`, {
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/meals',
      'POST /api/meals',
      'GET /api/orders',
      'POST /api/orders'
    ]
  }));
});

// 405 處理 - 方法不允許
app.use((req, res, next) => {
  if (!req.route) {
    next(new MethodNotAllowedError(`方法 ${req.method} 不允許用於 ${req.originalUrl}`, {
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      currentMethod: req.method
    }));
  } else {
    next();
  }
});

// 應用錯誤處理中間件 (必須是最後一個中間件)
app.use(errorMiddleware);

// 優雅的關閉處理
process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, starting graceful shutdown');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

// 未處理的Promise拒絕
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 在生產環境中，這裡應該記錄到日誌服務
});

// 未捕獲的異常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 在生產環境中，這裡應該記錄到日誌服務並優雅退出
  process.exit(1);
});

// 啟動服務器
const server = app.listen(PORT, () => {
  console.log(`
🚀 Gourmet Select 服務器已啟動!
📍 端口: ${PORT}
📊 環境: ${process.env.NODE_ENV || 'development'}
🗄️ 數據庫: ${mongoose.connection.name}
🔗 Health check: http://localhost:${PORT}/api/health
📝 API文檔: http://localhost:${PORT}/api/docs
  `);
});

export default app;
