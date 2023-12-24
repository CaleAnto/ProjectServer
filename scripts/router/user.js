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

        const newUserWithoutRole = { ...newUser.toJSON() };
        delete newUserWithoutRole.role;

        res.status(201).json(newUserWithoutRole);

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
        const user = await User.findById(decodedJWT(req.header('Authorization')).userId).select('-password -__v -role');
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при получении пользователя' });
    }
});

router.get("/subscribe", async (req, res) => {
    try {
        const subscribe = await Subscribe.find();
        res.json({subscribe});
    } catch(error) {
        console.log(error);
    }
});

router.post("/subscribe", authenticateJWT, async (req, res) => {

    const { card, date, cvv, subscribe } = req.body;

    const requiredParams = ['card', 'date', 'ccv', 'subscribe'];
    const missingParams = requiredParams.filter(param => !req.body[param]);

    if (missingParams.length > 0) {
        return res.status(400).json({ missingParams: `Missing required parameters: ${missingParams.join(', ')}` });
    }

    try {
        const token = decodedJWT(req.header('Authorization'));

        const sub = await Subscribe.findById(subscribe);
        if(sub.name === "Rent") {
            const { space } = req.body;
            if(!space) {
                return res.status(400).json({ missingParams: `Missing required parameters: space` });
            }
            await User.findByIdAndUpdate(token.userId, {
                subscribe: sub._id,
                endSubscribe: sub.limit,
            })
            await Storage.findOneAndUpdate({owner: token.userId}, {
                space: space,
                maxweight: space*100,
                maxheight: space*200
            })
        } else {
            await User.findByIdAndUpdate(token.userId, {
                subscribe: sub._id,
                endSubscribe: sub.limit,
            })
            await Storage.findOneAndUpdate({owner: token.userId}, {
                space: sub.add,
                maxweight: sub.add*100,
                maxheight: sub.add*200
            })
        }

        const user = await User.findById(token.userId).select('-password -__v');
        res.json(user);

    } catch (error) {
        console.log(error);
    }
});


module.exports = router;