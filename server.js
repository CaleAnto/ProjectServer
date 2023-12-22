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

const swaggerPath = path.join(__dirname, 'swagger.yaml');

try {
  // Загрузка содержимого файла swagger.yaml
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
  const swaggerDocument = yaml.load(swaggerContent);

  // Использование Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Error loading swagger.yaml:', error);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Listern Port ' + PORT);
});
