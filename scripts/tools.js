const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { User } = require('./models.js');

const secretKey = process.env.SECRETKEY;
const refreshSecretKey = process.env.REFRESHKEY;

//Storage

const uploadPath = path.join(__dirname, '..', 'Photo');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage});

//

function authenticateJWT(req, res, next) {
    const authHeader = req.header('Authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
  
      if (token) {
        jwt.verify(token, secretKey, (err, user) => {
          if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
          }
  
          req.user = user;
          next();
        });
      } else {
        return res.status(401).json({ error: 'Токен не предоставлен' });
      }
    } else {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }
};

function generateAccessToken(user) {
  return jwt.sign({userId: user._id, username: user.username}, secretKey, {expiresIn: '12h'});
};

function generateRefreshToken(user) {
  return jwt.sign({userId: user._id, username: user.username}, refreshSecretKey, {expiresIn: '3d'});
};

async function authenticateAdmin(req, res, next) {
  const authHeader = req.header('Authorization');

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    if (token) {
      try {
        const decodedToken = jwt.verify(token, secretKey);

        const user = await User.findById(decodedToken.userId);

        if (!user) {
          return res.status(403).json({ error: 'Пользователь не найден' });
        }

        if (user.role !== 'Admin') {
          return res.status(403).json({ error: 'Доступ запрещен. Недостаточно прав' });
        }

        req.user = user;
        next();
      } catch (err) {
        return res.status(403).json({ error: 'Неверный токен' });
      }
    } else {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
  } else {
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }
}

function decodedJWT(auth) {
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, secretKey);
  return decoded;
};

function decodedRefresh(auth) {
    return jwt.verify(auth, refreshSecretKey);
};

module.exports = { 
  authenticateJWT, 
  decodedJWT, 
  generateAccessToken, 
  generateRefreshToken, 
  decodedRefresh, 
  authenticateAdmin, 
  upload,
}

// const crypto = require('crypto');

// const generateSecretKey = () => {
//   return crypto.randomBytes(32).toString('hex');
// };

// const secretKey = generateSecretKey();
// console.log('Сгенерированный секретный ключ:', secretKey);