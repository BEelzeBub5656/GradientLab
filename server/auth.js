/**
 * auth.js — 认证与角色中间件
 */
const jwt = require('jsonwebtoken');

// JWT 密钥（常量）
const JWT_SECRET = 'CampusRepair_SecretKey_2026';
const JWT_EXPIRES = '7d';

/**
 * 签发 token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * 验证 token 中间件
 * 从 Authorization: Bearer <token> 中解出 payload 挂到 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效或过期的令牌' });
  }
}

/**
 * 角色校验中间件工厂
 * 用法：router.put('/xxx', requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

module.exports = { signToken, authMiddleware, requireRole, JWT_SECRET };
