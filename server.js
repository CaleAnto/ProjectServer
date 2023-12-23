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

const folderPath = path.join(__dirname, 'Receipts');
app.use("/receipts", express.static(folderPath));

const swaggerDocument = yaml.load('./swagger.yaml'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Listern Port ' + PORT);
});
