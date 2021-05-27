const express = require('express');

const morgan = require('morgan');
const app = express();

// 1) Middlewares
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Morgan middleware 3rd party

// Middleware between request and response
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  // console.log(req.headers);
  next();
});

// 3) Routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// All other unhandled urls
app.all('*', (req, res, next) => {
  next(new AppError(`Unable to get ${req.originalUrl} on this server`, 404));
});

// Error Handling Middleware
app.use(globalErrorHandler);
module.exports = app;
