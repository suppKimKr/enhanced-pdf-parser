const errorHandler = require('./errorHandler');
const asyncHandler = require('./asyncHandler');
const uploadHandler = require('./uploadHandler');
const { wrapRouter } = require('./routeWrapper');

module.exports = {
    errorHandler,
    asyncHandler,
    wrapRouter,
    uploadHandler,
};