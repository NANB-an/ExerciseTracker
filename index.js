const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// User Routes
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  newUser.save()
    .then(user => res.json({ username: user.username, _id: user._id }))
    .catch(err => {
      if (err.code === 11000 && err.keyPattern && err.keyPattern.username === 1) {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        console.error("Error creating user:", err);
        res.status(500).json({ error: 'Server error' });
      }
    });
});

app.get('/api/users', (req, res) => {
  User.find({})
    .then(users => res.json(users))
    .catch(err => res.status(500).json({ error: 'Server error' }));
});

// Exercise Routes
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newExercise = new Exercise({
        username: user.username,
        description,
        duration: +duration,
        date: date ? new Date(date) : undefined,
      });

      newExercise.save()
        .then(exercise => {
          res.json({
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString(),
            _id: user._id,
          });
        })
        .catch(err => res.status(500).json({ error: 'Server error' }));
    })
    .catch(err => res.status(500).json({ error: 'Server error' }));
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let query = { username: user.username };
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = new Date(from);
        if (to) query.date.$lte = new Date(to);
      }

      Exercise.find(query)
        .limit(limit ? +limit : Infinity)
        .then(exercises => {
          const log = exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString(),
          }));

          res.json({
            _id: user._id,
            username: user.username,
            count: log.length,
            log,
          });
        })
        .catch(err => res.status(500).json({ error: 'Server error' }));
    })
    .catch(err => res.status(500).json({ error: 'Server error' }));
});


// Date/Timestamp API
app.get('/api/:date?', (req, res) => {
  let dateParam = req.params.date;

  if (!dateParam) { // Empty date parameter - current time
    const now = new Date();
    res.json({
      unix: now.getTime(),
      utc: now.toUTCString(),
    });
    return;
  }

  let date;
  if (!isNaN(dateParam)) { // Unix timestamp (milliseconds)
    date = new Date(parseInt(dateParam));
  } else { // Date string
    date = new Date(dateParam);
  }

  if (isNaN(date)) { // Invalid date
    res.json({ error: "Invalid Date" });
    return;
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString(),
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});