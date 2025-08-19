const { logger } = require('../lib');

/**
 * 에러 핸들러 미들웨어
 * 모든 라우터에서 발생하는 에러를 로깅하고 Sentry로 전송
 */
const errorHandler = (err, req, res) => {
    // 에러 정보 수집
    const errorInfo = {
        url: req.originalUrl,
        method: req.method,
        params: req.params,
        query: req.query,
        body: req.body,
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name,
        },
        location: err.stack ? err.stack.split('\n')[1].trim() : 'Unknown location',
    };

    // 로그 기록
    logger.error(`Error occurred in ${req.method} ${req.originalUrl} [${req.clientIp}]`, errorInfo);

    // 클라이언트에 응답
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        error: process.env.NODE_ENV === 'production' ? {} : errorInfo,
    });
};

module.exports = errorHandler;
