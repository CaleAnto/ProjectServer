const { app, mongoose } = require('./scripts/connect.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const userRoute = require('./scripts/router/user.js');
app.use("/", userRoute);

const storageRoute = require('./scripts/router/router.js');
app.use("/api", storageRoute);

const pathReceipts = path.join(__dirname, 'Receipts');
app.use("/receipts", express.static(pathReceipts));

const pathPhoto = path.join(__dirname, 'Photo');
app.use("/photo", express.static(pathPhoto));

const swaggerDocument = yaml.load(fs.readFileSync(path.resolve(__dirname, 'swagger.yaml'), 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Listern Port ' + PORT);
});
