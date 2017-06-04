const SHARED_SECRET = 'sfkufh838Hf';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const faker = require('faker');

const {app, runServer, closeServer} = require('../app');
const {encrypt, decrypt, authorization, authentication, password} = require('../system/security/');

chai.use(chaiHttp);

const should = chai.should();

describe('Security', function() {
  let session = null;
  let decryptedPayload = null;

	before(function() {
		return runServer();
	});
	after(function() {
		return closeServer();
	});

	it('should be able to decrypt an encrypted payload', function() {

    const payload = {
      "username": "howdy",
      "email": faker.internet.email(),
      "password": "hashMe"
    };

    let encryptedPayload = encrypt(payload);
    let decryptedPayload = decrypt(encryptedPayload);

    const answer = (payload.username === decryptedPayload.username) && 
                   (payload.email === decryptedPayload.email) && 
                   (payload.password === decryptedPayload.password);

    answer.should.be.true;
	});

  it ('should hash a password, compare it to the original, and return true', function(done) {
    const unencryptedPassword = 'hamburger';
    const encryptedPassword = password.create(unencryptedPassword)
      .then(function(res) {
        password.compare(unencryptedPassword, res)
          .then(function(res) {
            res.should.be.true;
          })
          .then(done);
      }, function(err) {
        console.log(err);
      });
  });


  it ('should create a user', function() {
    const newUser = { username: 'John Smith', email: faker.internet.email(), password: 'shenanigans' };
    const encryptedPayload = encrypt(newUser);

    return chai.request(app)
      .post('/users')
      .send({ payload: encryptedPayload })
      .then(function(res) {
        res.should.have.status(201);
        res.should.be.json;
        res.should.be.a('object');
        res.body.should.include.keys('user_id');
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  it ('should log a user in', function() {
    const userLoggingIn = { email: 'Lilla53@gmail.com', password: 'shenanigans' };
    const encryptedPayload = encrypt(userLoggingIn);

    return chai.request(app)
      .post('/login')
      .send({ payload: encryptedPayload })
      .then(function(res) {
        res.should.have.status(201);
        res.body.should.be.a('object');
        res.body.should.include.keys('token');
        return res;
      })
      .then(function(res) {
        session = res.body.token;
        decryptedPayload = decrypt(res.body.token);
        // for some reason, this decryptedPayload is wrapped in meta information
        (decryptedPayload.email || decryptedPayload._doc.email).should.equal(userLoggingIn.email);
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  it ('should create a movie', function() {
    const newMovie = { date: { year: '2017', month: 'March', day: '8' }, title: 'The Best Movie' };

    return chai.request(app)
      .post(`/users/${decryptedPayload._doc._id}/movies`)
      .set('Authorization', 'Bearer ' + session)
      .send(newMovie)
      .then(function(res) {
        res.should.have.status(201);
        res.body.should.be.a('object');
        res.body.should.include.keys('user_id', 'title', 'date');
        res.body.user_id.should.equal(decryptedPayload._doc._id);
        res.body.title.should.equal(newMovie.title);
        res.body.date.should.equal(newMovie.date.month + ' ' + newMovie.date.day + ' ' + newMovie.date.year);
        return res;
      })
      .catch(function(err) {
        console.error(err);
      });
  });

  it ('should let an authenticated user access protected endpoints', function() {

    return chai.request(app)
      .get(`/users/${decryptedPayload._doc._id}/movies`)
      .set('Authorization', 'Bearer ' + session)
      .then(function(res) {
        let badMovies = res.body.filter(function(movie) { return movie.user_id != decryptedPayload._doc._id; }).length;
        badMovies.should.equal(0);
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  it ('should let authenticated users update one of their movies', function() {

    let randomMovie = '';

    // provide an object to update the movie with
    const updateData = { title: 'Updated Movie', starRating: 3, review: 'This movie combines action and the Department of Motor Vehicles in a way I have never seen on film.' };
    // someone should check to make sure starRatings are between 0 and 5 and that IDs aren't being updated

    // first get a movie's ID to update
    return chai.request(app)
      .get(`/users/${decryptedPayload._doc._id}/movies`)
      .set('Authorization', 'Bearer ' + session)
      .then(function(res) {
        // choose a movie to update at random
        const randomIndex = (Math.floor(Math.random() * (res.body.length + 1)));
        randomMovie = res.body[randomIndex];

        // update the movie chosen at random
        return chai.request(app)
          .put(`/users/${decryptedPayload._doc._id}/movies/${randomMovie._id}`)
          .set('Authorization', 'Bearer ' + session)
          .send(updateData);
      })
      .then(function(res) {
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.title.should.equal(updateData.title);
        res.body.starRating.should.equal(updateData.starRating);
        res.body.review.should.equal(updateData.review);
      })
      .catch(function(err) {
        console.log(err);
      });
  });


  it ('should let an authenticated user delete one of their own movies', function() {
    let deletedMovie;
    let deletedMovieID;

    return chai.request(app)
      .get(`/users/${decryptedPayload._doc._id}/movies`)
      .set('Authorization', 'Bearer ' + session)
      .then(function(res) {
        // choose a movie to delete at random
        const randomIndex = (Math.floor(Math.random() * (res.body.length + 1)));
        const deletedMovie = res.body[randomIndex];
        deletedMovieID = deletedMovie._id;

        // delete the movie chosen at random
        return chai.request(app)
          .delete(`/users/${decryptedPayload._doc._id}/movies/${deletedMovieID}`)
          .set('Authorization', 'Bearer ' + session);
      })
      .then(function(res) {
        res.should.have.status(204);

        return chai.request(app)
          .get(`/users/${decryptedPayload._doc._id}/movies`)
          .set('Authorization', 'Bearer ' + session)
          .then(function(remainingMovies) {
            let undeletedMovies = remainingMovies.body.filter(function(movie) { return movie._id === deletedMovieID; }).length;
            undeletedMovies.should.equal(0);
          })
      })
      .catch(function(err) {
        console.log(err);
      });
  });

});