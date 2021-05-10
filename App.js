const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const app = express();

// 1) Middlewares

// Morgan middleware 3rd party
app.use(morgan('dev'));

// Middleware between request and response
app.use(express.json());

// Middleware
app.use((req, res, next) => {
  console.log('Hi from middleware 👋');
  next();
});

// app.get('/', (req, res) => {
//   res.status(200).json({ message: 'Hello World!' });
// });

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

// 2) Route Handlers
const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
};

const getTour = (req, res) => {
  const id = +req.params.id;
  const tour = tours.find((el) => el.id === id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
};

const updateTour = (req, res) => {
  const id = +req.params.id;
  const tour = tours.find((el) => el.id === id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: { tour: 'tour' },
  });
};

const deleteTour = (req, res) => {
  const id = +req.params.id;
  const tour = tours.find((el) => el.id === id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
};

const createTour = (req, res) => {
  // console.log(req.body);
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body);
  tours.push(newTour);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'success',
        data: {
          newTour,
        },
      });
    }
  );
};

// Get Request
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// Path request
// app.patch('/api/v1/tours/:id', updateTour);

// Delete request
// app.delete('/api/v1/tours/:id', deleteTour);

// Post request
// app.post('/api/v1/tours', createTour);

// 3) Routes
app.route('/api/v1/tours').get(getAllTours).post(createTour);
app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

// 4) Start server
const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
