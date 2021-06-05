const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exists
  if (!email || !password) {
    return next(new AppError(`Please provide email and password!`, 400));
  }

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(`Incorrect email or password!`, 401));
  }

  // 3) Everything okay then generate token and send it to client

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) check if the authorization header is present then extract it
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError(`You are not logged in! Please log in to get access.`, 401)
    );
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists
  const freshUser = await User.findById(decoded.id);

  if (!freshUser)
    return next(
      new AppError(`The user belonging to this token does not exist.`, 401)
    );
  // 4) Check if the user changed the password after the token was issued.
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        `User recently changed the password! Please login again`,
        401
      )
    );
  }

  // Grant access to protected route
  req.user = freshUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`You don't have access to perform this action`, 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError(`There is no user present with this email address!`, 404)
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgor your password?
  Reset your password = ${resetURL}
  If you did not make this request, your email adress may have been entered by mistake and you can safely disregard this email. Visist your accound seetings page on natours to update your information.
  if you have any problems, please contact us: natour-support@natours.io `;

  try {
    await sendEmail({
      email: user.email,
      subject: `your password reset token (valid for 10 mins)`,
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'token sent to the provided email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        `There was and error sending this email! try again later`,
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If the token has not expired and the user is present then set the password
  if (!user) {
    return next(new AppError(`Token is invalid or has expired!`, 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from Collection
  const user = await User.findById(req.user.id).select('+password');
  console.log(req.body);
  console.log(user);
  // 2) check if POSTed current password is current
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(`Your current password is wrong!`, 401));
  }

  // 3) If so then update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) log user in and send jwt
  createSendToken(user, 201, res);
});
