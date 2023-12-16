const { app } = require('./scripts/connect.js');
const path = require('path');
const express = require('express');

const userRoute = require('./scripts/router/user.js');
app.use("/", userRoute);

const storageRoute = require('./scripts/router/router.js');
app.use("/api", storageRoute);

const employeesRoute = require('./scripts/router/employees.js');
app.use("/employees", employeesRoute)

const folderPath = path.join(__dirname, 'Receipts');
app.use('/receipts', express.static(folderPath));

const PORT = process.env.PORT || 3000;
const now = new Date();
app.listen(PORT, () => {
  console.log('Listern Port ' + PORT);
  console.log(now)
});