const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const { User } = require('./models.js');

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

// mongoose.connect(process.env.MONGO_DB);
mongoose.connect("mongodb://127.0.0.1:27017/storage");


mongoose.connection.on('connected', async () => {
  console.log('Connected');

  const user1Exists = await User.exists({ username: 'admin1' });
  const user2Exists = await User.exists({ username: 'admin2' });

  if (!user1Exists) {
    const user1 = new User({
      username: 'admin1',
      password: 'password1',
      name: '-',
      year: 0,
      role: "Admin"
    });
    await user1.save();
    console.log('User 1 created');
  }

  if (!user2Exists) {
    const user2 = new User({
      username: 'admin2',
      password: 'password2',
      name: '-',
      year: 0,
      role: "Admin"
    });
    await user2.save();
    console.log('User 2 created');
  }

  console.log('Users checked and created if needed');

  // Ваш остальной код при подключении к базе данных

});

mongoose.connection.on('error', (err) => {
  console.error('Error connect:', err);
});

module.exports = { app, mongoose, express }
