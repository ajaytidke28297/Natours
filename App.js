const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// 1) Middlewares
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// Cors
app.use(
  cors({
    origin: '*',
  })
);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)Global Middlewares
// Serving Static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security http headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit request for same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: `Too many request from same IP, Please try again after an hour!`,
});

app.use('/api', limiter);

// Body parser, rendering data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitize against NoSQL query injection
app.use(mongoSanitize());

// Data sanitize agains XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use((req, res, next) => {
  // console.log(req.headers);
  next();
});

// 3) Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// All other unhandled urls
app.all('*', (req, res, next) => {
  next(new AppError(`Unable to get ${req.originalUrl} on this server`, 404));
});

// Error Handling Middleware
app.use(globalErrorHandler);
module.exports = app;
