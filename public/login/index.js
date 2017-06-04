const bodyParser = require('body-parser');
const express = require('express');

const router = require('express').Router();
const mongoose = require('mongoose');
const passport = require('passport');

const {BasicStrategy} = require('passport-http');
const Strategy = require('passport-http-bearer').Strategy;

const {User, Authorization} = require('../../models');

const {encrypt, decrypt, detokenize, authorization, authentication, password} = require('../../system/security/');

const app = express();
app.use(bodyParser.json());


router.post('/', detokenize, (req, res) => {
  // /login endpoint

  // check to make sure the user has all the information needed to log in
  const requiredFields = ['email', 'password'];

  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing  ${field} in request body.`;
      console.error(message);
      return res.status(400).send(message);
    }
  }


  User
    .findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        res.status(404).json({ error: 'The user does not exist.' });
      }
      else {
        if (password.compare(req.body.password, user.password)) {
          let token = encrypt(user);

          Authorization
            .create({
              user_id: user.id,
              token: token
            })
            .then((authorizedUser) => {
              res.status(201).json({ token: token });
            })
            .catch((err) => {
              res.status(500).json({ error: 'Error creating session: ' + err });
            })
            
        }
        else {
          res.status(401).json({ error: 'The password is wrong.' });
        }
      }
    })
    .catch((err) => {
      res.status(500).json({ error: 'Login error: ' + err });
    })
});


module.exports = router;