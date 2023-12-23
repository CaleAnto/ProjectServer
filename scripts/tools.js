const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

function authenticateAdmin(req, res, next) {
  const authHeader = req.header('Authorization');
  const requiredWord = process.env.ADMINKEY;

  if (authHeader) {
      const token = authHeader.split(' ')[1];

      if (token === requiredWord) {
          next();
      } else {
          return res.status(403).json({ error: 'У вас нет необходимых прав' });
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