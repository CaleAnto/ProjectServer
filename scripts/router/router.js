const randomatic = require('randomatic');
const fs = require('fs');
const path = require('path');

const { express } = require('../connect.js');
const { authenticateJWT, decodedJWT } = require('../tools.js');

const router = express.Router();
const { Product, Storage, Order, User } = require('../models');

router.get("/storage", authenticateJWT, async (req, res) => {
    try{
        const token = decodedJWT(req.header('Authorization'));
        const storage = await Storage.findOne({ owner: token.userId })
        .populate({
            path: 'repository',
            model: 'product'
        });

        res.json(storage);

    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/storage", authenticateJWT, async (req, res) => {

    const { name, description, price, count, weight, height } = req.body;

    const requiredParams = ['name', 'description', 'price', 'count', 'weight', 'height'];
    const missingParams = requiredParams.filter(param => !req.body[param]);

    if (missingParams.length > 0) {
        return res.status(400).json({ missingParams: `Missing required parameters: ${missingParams.join(', ')}` });
    }

    try {
        const token = decodedJWT(req.header('Authorization'));
        const storage = await Storage.findOne({ owner: token.userId });

        if (storage.space === 0) {
            return res.status(403).send("Нету свободных мест, приобритите подписку");
        }

        if(storage.space < count && storage.maxheight < height && storage.maxweight < weight) {
            return res.status(403).send("Слишком много товара.");
        };

        const product = await Product.create({
            name,
            description,
            count,
            weight,
            height,
            price,
            status: "Active"
        });

        product.save();

        await Storage.findByIdAndUpdate(storage._id, {
            $push: { repository: product._id },
            $inc: { space: -count, maxweight: -weight, maxheight: -height }
        });

        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/order", authenticateJWT, async (req, res) => {
    try {
        const token = decodedJWT(req.header('Authorization'));

        const orders = await Order.find({ customer: token.userId })
            .populate({
                path: 'order',
                model: 'product',
                select: 'name description price'
            })
            .populate({
                path: 'customer',
                model: 'user',
                select: 'username -_id' 
            })
            .exec();

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/order", authenticateJWT, async (req, res) => {
    try {
        const { names } = req.body;

        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).send("Invalid or empty product names array");
        }

        const token = decodedJWT(req.header('Authorization'));

        const products = await Product.find({ name: { $in: names } });

        if (products.length === 0) {
            return res.status(404).send("No products found for the given names");
        }

        const productIds = products.map(product => product._id);

        const storage = await Storage.findOne({ repository: { $in: productIds } });

        const createdOrders = await Order.create({
            customer: token.userId,
            order: productIds,
            in: storage._id,
            status: "Wait",
        });

        res.json(createdOrders);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/order/:code", authenticateJWT, async(req, res) => {
    try {

        const token = decodedJWT(req.header('Authorization'));
        const { code } = req.params;

        if (!code && code === '-') {
            return res.status(400).json({ missingParams: 'Missing required parameters - code' });
        }

        const order = await Order.findOne({check: code})
            .populate({
                path: 'order',
                model: 'product',
                select: 'name description price'
            })
            .populate({
                path: 'customer',
                model: 'user',
                select: 'username -_id' 
            })
            .select('-check -status')
            .exec();

        if(!order) {
            return res.status(404).send("Wrong code.");
        }
            
        await Order.findByIdAndUpdate(order._id, {
            status: "Complete",
            $unset: { check: 1 }
        });

        const currentDate = new Date();
        const cheque = {
            ...order.toObject(),
            time: currentDate, 
        };

        const fileName = `cheque_${cheque._id}.txt`;
        const folderPath = path.join(__dirname, '..', '..', 'Receipts');
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        fs.writeFile(filePath, JSON.stringify(cheque, null, 2), (err) => {
            if (err) {
                console.error('Error creating JSON file:', err);
            } else {
                res.json("complete")
            }
        });

        await User.findByIdAndUpdate(token.userId, {
            $push: {ticket: `http://localhost:3000/receipts/${fileName}`}
        })


    } catch(error) {
        console.log(error);
    }
}); //Complete

router.post("/order/complete", async (req, res) => {
    try {

        const { id } = req.body;

        if (!id) {
            return res.status(400).send("Invalid or empty product id array");
        };

        const order = Order.findById(id);

        if(!order.check) {
            return res.status(400).send("This order has already been completed.");
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

module.exports = router
