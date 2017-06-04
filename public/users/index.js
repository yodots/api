const bodyParser = require('body-parser');
const express = require('express');

const router = require('express').Router();
const {User, Movie, Authorization} = require('../../models');

const {authorization, authentication, password} = require('../../system/security/');

const app = express();

app.use(bodyParser.json());


router.post('/', (req, res) => {
  // /users endpoint
  const requiredFields = ['username', 'email', 'password'];

  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      return res.status(400).json({ error: `Missing ${field} in request body.` });
    }
  }

  password
    .create(req.body.password)
    .then(hashedPassword => {
      User
        .create({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword
        })
        .then(
          (user) => { res.status(201).json({ user_id: user.id }) }
        )
        .catch(err => {
          res.status(500).json({ error: 'The user could not be created.' });
        });
    })
});


// check that the user is logged in (authentication) and whether they're allowed to see what they're seeing (authorization)
router.get('/:userId/movies', authentication, authorization, (req, res) => {
  // /users/:id/movies endpoint

  Movie
    .find({ user_id: req.params.userId })
    .exec()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong. (getting a user's movies)` });
    });
});


// using the user's id, update the username field contained in req.body
router.put('/:userId', authentication, authorization, (req, res) => {
  // /users/:id endpoint

  const updated = {};
  const updateableFields = ['username'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  console.log(updated);

  User
    .findByIdAndUpdate(req.params.userId, {$set: updated}, {new: true})
    .exec()
    .then((updatedUser) => {
      res.status(201).json({ username: updatedUser.username })
    })
    .catch((err) => {
      res.status(500).json({ message: `Something went wrong. (updating user's username)` });
    });
});


// create a new movie (user id, date and title required) and add it to the movies database
router.post('/:userId/movies', authentication, authorization, (req, res) => {
  const requiredFields = ['date', 'title'];
  let starRating = 0;
  let review = '';

  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      console.error(message);
      return res.status(400).json({ error: `Missing \`${field}\` in request body. (adding movie to database)` });
    }
  }

  if (req.body.starRating)
    starRating = req.body.starRating;

  if (req.body.review)
    review = req.body.review;

  Movie
    .create({
      user_id: req.params.userId,
      title: req.body.title,
      date: {
        year: req.body.date.year,
        month: req.body.date.month,
        day: req.body.date.day
      },
      starRating: starRating,
      review: review
    })
    .then((newMovie) => {
      res.status(201).json(newMovie.apiRepr());
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong. (adding movie to database)` });
    });
});


// using the movie's id, update the fields contained in req.body
router.put('/:userId/movies/:movieId', authentication, authorization, (req, res) => {
  const updated = {};
  const updateableFields = ['title', 'date', 'starRating', 'review']

  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  Movie
    .findByIdAndUpdate(req.params.movieId, {$set: updated}, {new: true})
    .exec()
    .then((updatedMovie) => {
      res.status(201).json(updatedMovie.apiRepr())
    })
    .catch((err) => {
      res.status(500).json({ message: `Something went wrong. (updating movie fields)` });
    });
});


// find the movie by id and delete it
router.delete('/:userId/movies/:movieId', authentication, authorization, (req, res) => {
  const movieName = req.body.title;

  Movie
    .findByIdAndRemove(req.params.movieId)
    .exec()
    .then(() => {
      res.status(204).json({ message: `${movieName} successfully removed!` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong. (deleting movie from database)` });
    });
});

module.exports = router;



