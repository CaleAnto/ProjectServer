const randomatic = require('randomatic');
const { express, secretKey } = require('../connect.js');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateJWT, decodedJWT } = require('../tools.js')

const { User, Product, Storage, Order, Subscribe } = require('../models');

router.get("/all", async (req, res) => {
    try {
        const userIds = await User.distinct('_id');
        const storageIds = await Storage.distinct('_id');

        res.json({ users: userIds, storage: storageIds });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/order/complete", async (req, res) => {
    try {

        const { id } = req.body;

        if (!id) {
            return res.status(400).send("Invalid or empty product id array");
        }

        await Order.findByIdAndUpdate(id, {
            status: "Ready to be issued",
            check: randomatic('A0', 5)
        });

        res.json("Complete")

    } catch(error) {
        console.log(error);
    }
});


module.exports = router;