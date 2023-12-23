const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

app.use(bodyParser.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

mongoose.connect(process.env.MONGO_DB);
// mongoose.connect("mongodb://127.0.0.1:27017/storage");


mongoose.connection.on('connected', () => {
  console.log('Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('Error connect:', err);
});

module.exports = { app, mongoose, express }
