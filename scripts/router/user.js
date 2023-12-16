const { express } = require('../connect.js');
const router = express.Router();
const { authenticateJWT, decodedJWT, generateAccessToken, generateRefreshToken, decodedRefresh } = require('../tools.js')

const { User, Storage, Subscribe } = require('../models');

router.post("/register", async (req, res) => {
    const { username, password, name, year } = req.body;

    const requiredParams = ['username', 'password', 'year', 'name'];
    const missingParams = requiredParams.filter(param => !req.body[param]);

    if (missingParams.length > 0) {
        return res.status(400).json({ missingParams: `Missing required parameters: ${missingParams.join(', ')}` });
    }

    try {
        const newUser = await User.create({
            username: username.toLowerCase(),
            password,
            name,
            year,
        });

        await Storage.create({
            owner: newUser._id
        });

        res.status(201).json(newUser);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            res.status(400).json({ ValidationError: errors });
        } else if (error.name === 'MongoServerError' && error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const value = error.keyValue[field];
            res.status(409).json({ MongoServerError: `Пользователь с ${field} '${value}' уже существует` });
        } else {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    }
}); //Complete

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.password !== password) {
            return res.status(400).json({ error: "Incorrect password" });
        }

        const access = generateAccessToken(user);
        const refresh = generateRefreshToken(user);

        res.json({ access, refresh });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error during login' });
    }
}); //Complete

router.post('/refresh', async (req, res) => {
    const refreshToken = req.body.refresh;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token is required.' });
    }

    try {
        const decoded = decodedRefresh(refreshToken);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: 'Invalid or malformed token.' });
        }

        const userId = decoded.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        const newAccessToken = generateAccessToken({ _id: userId, username: user.username });

        res.json({ access: newAccessToken });
    } catch (error) {
        console.error(error);
        res.status(403).json({ message: 'Invalid refresh token.' });
    }
}); //Complete

router.get("/get-user", authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(decodedJWT(req.header('Authorization')).userId).select('-password -__v');
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при получении пользователя' });
    }
});

router.get("/subscribe", async (req, res) => {
    try {
        const subscribe = await Subscribe.find()
        res.json({subscribe})
    } catch(error) {
        console.log(error)
    }
});

router.get('/', authenticateJWT, (req, res) => {
    res.json("Hello World");
    console.log('Декодированные данные из JWT токена:', decodedJWT(req.header('Authorization')));
}) // For check for JWT token

module.exports = router