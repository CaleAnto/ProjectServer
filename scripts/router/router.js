const randomatic = require('randomatic');
const fs = require('fs');
const path = require('path');

const { express } = require('../connect.js');
const { authenticateJWT, decodedJWT, authenticateAdmin, upload } = require('../tools.js');

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

router.post("/storage", authenticateAdmin, upload.array('photos', 4), async (req, res) => {

    const { name, description, count, weight, height, userId } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Файлы с изображениями отсутствуют' });
    }

    const requiredParams = ['name', 'description', 'count', 'weight', 'height', 'userId'];
    const missingParams = requiredParams.filter(param => !req.body[param]);

    if (missingParams.length > 0) {
        req.files.forEach(file => {
            fs.unlinkSync(file.path);
        });
        return res.status(400).json({ missingParams: `Missing required parameters: ${missingParams.join(', ')}` });
    }

    try {
        const storage = await Storage.findOne({ owner: userId });

        if (storage.space === 0) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            return res.status(403).send("Нету свободных мест, приобритите подписку");
        }

        if(storage.space < count && storage.maxheight < height && storage.maxweight < weight) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            return res.status(403).send("Слишком много товара.");
        };

        if(!storage) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            return res.status(403).send("Неверный user Id");
        }

        const photoArray = req.files.map(file => file.filename);

        const product = await Product.create({
            name,
            description,
            count,
            weight,
            height,
            status: "In processing",
            photo: photoArray,
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
}); //Complete

router.get("/storage/all", authenticateAdmin, async (req, res) => {
    try {
        const storage = await Storage.find()
        .populate({
            path: 'repository',
            model: 'product',
        })
        .populate({
            path: 'owner',
            model: 'user',
            select: '-password' 
        })
        .select('-check -status')
        .exec();

        res.json(storage)
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

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
            $push: {ticket: `/receipts/${fileName}`}
        })


    } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); //Complete

router.post("/order/complete", authenticateAdmin, async (req, res) => {
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/product/status", authenticateAdmin, async (req, res) => {
    try {

        const { id, status } = req.body;

        if (!id) {
            return res.status(400).send("Invalid or empty product id array");
        };

        if (!status) {
            return res.status(400).send("Invalid or empty status");
        };

        const product = Product.findById(id);

        if(!product) {
            return res.status(400).send("This wrong id");
        }

        await Product.findByIdAndUpdate(id, {
            status: status,
        })

        res.json("Complete")

    } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/product/position", authenticateAdmin, async (req,res) => {
    try {

        const { id, position } = req.body;

        if (!id) {
            return res.status(400).send("Invalid or empty product id array");
        };

        if (!position) {
            return res.status(400).send("Invalid or empty position");
        };

        const product = Product.findById(id);

        if(!product) {
            return res.status(400).send("This wrong id");
        }

        await Product.findByIdAndUpdate(id, {
            position: position
        })
        
        res.json("Complete")

    } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post("/product/generate",  async (req,res) => {
    
    try {

        const { id } = req.body;

        if (!id) {
            return res.status(400).send("Invalid or empty product id");
        };
        
        const code = randomatic('A0', 5);

        await Product.findByIdAndUpdate(id, {
            check: code,
        })
        res.json(code)

    } catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    
})

router.get('/cheque/:file', function(req,res){
    const { file } = req.params;
    const filepath = `${__dirname}/../../Receipts/${file}`;

    res.download(filepath);
}); //Complete

router.get("/", authenticateAdmin, async(req,res) =>{
    res.json("Hello, World!")
})

module.exports = router
