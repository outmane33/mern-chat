const ApiError = require("../utils/apiError");

const globalerrorHandler = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(error, res);
  } else {
    if (error.name === "JsonWebTokenError") handleJwtInvalidSignature();
    if (error.name === "TokenExpiredError") handleJwtExpired();
    sendErrorForProd(error, res);
  }
};

const handleJwtInvalidSignature = () =>
  new ApiError("Invalid token, please login again", 401);

const handleJwtExpired = () =>
  new ApiError("Expired token, please login again", 401);

const sendErrorForDev = (error, res) => {
  return res.status(error.statusCode).json({
    status: error.status,
    error: error,
    message: error.message,
    stack: error.stack,
  });
};
const sendErrorForProd = (error, res) => {
  return res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

module.exports = globalerrorHandler;
