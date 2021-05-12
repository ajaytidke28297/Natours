const express = require('express');

const morgan = require('morgan');
const app = express();

// 1) Middlewares
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Morgan middleware 3rd party

// Middleware between request and response
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// Middleware
app.use((req, res, next) => {
  console.log('Hi from middleware 👋');
  next();
});

// 3) Routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
