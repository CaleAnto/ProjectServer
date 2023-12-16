const jwt = require('jsonwebtoken');

const secretKey = '0d6a21da7cca0b8624c661405444bcb52d8e7900d2e285dc9ff7e742264de3cb';
const refreshSecretKey = '8f38c2aa9bd41d17d4a6c1f7bfab9405600836af760cd54507c7ca8bc8ece023';

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

function decodedJWT(auth) {
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, secretKey);
  return decoded;
};

function decodedRefresh(auth) {
    return jwt.verify(auth, refreshSecretKey);
};

module.exports = { authenticateJWT, decodedJWT, generateAccessToken, generateRefreshToken, decodedRefresh }

// const crypto = require('crypto');

// const generateSecretKey = () => {
//   return crypto.randomBytes(32).toString('hex');
// };

// const secretKey = generateSecretKey();
// console.log('Сгенерированный секретный ключ:', secretKey);