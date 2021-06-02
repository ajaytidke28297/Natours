const Review = require('../models/reviewModel');
const cathcAsync = require('../utils/catchAsync');

exports.getAllReviews = cathcAsync(async function (req, res, next) {
  const reviews = await Review.find();

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.createReview = cathcAsync(async function (req, res, next) {
  const newReview = await Review.create(req.body);

  res.status(200).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
});
