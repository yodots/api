const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const UserSchema = mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const MovieSchema = mongoose.Schema({
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  date: { 
    year: { type: String, required: true },
    month: { type: String, required: true },
    day: { type: String, required: true }
  },
  starRating: { type: Number, default: 0 },
  review: { type: String, default: 'You have not entered a review.' }
});

MovieSchema.virtual('monthAndDay').get(function() {
  return `${this.date.month} ${this.date.day}`.trim();
});

MovieSchema.virtual('fullDate').get(function() {
  return `${this.date.month} ${this.date.day} ${this.date.year}`.trim();
});

MovieSchema.methods.apiRepr = function() {
  return {
    id: this._id,
    user_id: this.user_id,
    title: this.title,
    date: this.fullDate,
    starRating: this.starRating,
    review: this.review
  };
}

const AuthorizationSchema = mongoose.Schema({
  user_id: { type: String, required: true },
  token: { type: String, required: true },
  created: { type: Date, required: true, default: Date.now() },
  expires: { type: Number, default: 8.64e+7 }
});

const User = mongoose.model('User', UserSchema);
const Movie = mongoose.model('Movie', MovieSchema);
const Authorization = mongoose.model('Authorization', AuthorizationSchema);

module.exports = {User, Movie, Authorization};