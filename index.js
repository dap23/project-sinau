require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const path = require('path');
const ejsMate = require('ejs-mate');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');

const initialize = require('./utils/passport-config');
const expressError = require('./utils/expressError');

const userRoute = require('./routes/user');
const courseRoute = require('./routes/course');

const User = require('./models/user');
const Course = require('./models/course');

const app = express();

initialize(
  passport,
  async (email) => {
    const user = await User.findOne({ email });
    return user;
  },
  async (id) => {
    const user = await User.findOne({ _id: id });
    return user;
  }
);

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.use('/course', courseRoute);
app.use('/auth', userRoute);

app.get('/', async (req, res) => {
  const courses = await Course.find({});
  res.render('pages/home', { courses, user: req.user, session: req.session });
});

app.get('/about', (req, res) => {
  res.render('pages/about', { user: req.user, session: req.session });
});

// app.get('/about', (req, res) => {
//   res.render('about', { user: req.user, session: req.session });
// });

app.all('*', (req, res, next) => {
  next(new expressError('Page Not found', 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = 'Someting Went Wrong!!';
  res.status(statusCode).render('pages/error', { err });
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`database and port is connected to port ${process.env.PORT}`);
    });
  })
  .catch((e) => {
    console.log(e);
  });
