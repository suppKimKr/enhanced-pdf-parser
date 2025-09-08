/**
 * 라우터 래퍼 유틸리티
 * 모든 라우터 핸들러에 에러 처리 및 로깅 기능을 추가
 */
const asyncHandler = require('./asyncHandler');
const { logger } = require('../lib');
const Format = require('response-format');
const _ = require('lodash');
const _path = require('path');

/**
 * 라우터 메소드를 래핑하여 에러 처리 및 로깅 기능 추가
 * @param {Object} router Express 라우터 객체
 * @returns {Object} 래핑된 라우터 객체
 */
function wrapRouter(router) {
    // 원본 라우터 메소드 저장
    const originalGet = router.get.bind(router);
    const originalPost = router.post.bind(router);
    const originalPut = router.put.bind(router);
    const originalDelete = router.delete.bind(router);
    const originalPatch = router.patch.bind(router);

    // GET 메소드 래핑
    router.get = function (path, ...handlers) {
        return originalGet(path, ...wrapHandlers(handlers, 'GET', path));
    };

    // POST 메소드 래핑
    router.post = function (path, ...handlers) {
        return originalPost(path, ...wrapHandlers(handlers, 'POST', path));
    };

    // PUT 메소드 래핑
    router.put = function (path, ...handlers) {
        return originalPut(path, ...wrapHandlers(handlers, 'PUT', path));
    };

    // DELETE 메소드 래핑
    router.delete = function (path, ...handlers) {
        return originalDelete(path, ...wrapHandlers(handlers, 'DELETE', path));
    };

    // PATCH 메소드 래핑
    router.patch = function (path, ...handlers) {
        return originalPatch(path, ...wrapHandlers(handlers, 'PATCH', path));
    };

    return router;
}

/**
 * 핸들러 배열을 래핑하여 에러 처리 및 로깅 기능 추가
 * @param {Array} handlers 핸들러 배열
 * @param {String} method HTTP 메소드
 * @param {String} path 라우트 경로
 * @returns {Array} 래핑된 핸들러 배열
 */
function wrapHandlers(handlers, method, path) {
    if (handlers.length === 0) return handlers;

    handlers = _.flattenDeep(handlers);

    // 미들웨어 핸들러는 그대로 유지
    const middlewares = handlers.slice(0, -1);

    // 마지막 핸들러만 래핑
    const lastHandler = handlers[handlers.length - 1];

    // 이미 래핑된 핸들러인지 확인
    if (lastHandler.__wrapped) return handlers;

    // 마지막 핸들러 래핑
    const wrappedHandler = asyncHandler(async (req, res, next) => {
        try {
            // 요청 시작 시간 기록
            const startTime = Date.now();

            // 원본 핸들러 실행
            await lastHandler(req, res, next);

            if (!_.includes(path, '*')) {
                // 요청 처리 시간 계산
                const responseTime = Date.now() - startTime;

                // 성공 로그 기록
                const logData = {
                    service: 'enhanced-pdf-parser',
                    environment: process.env.NODE_ENV,
                    method,
                    path: req.originalUrl,
                    statusCode: res.statusCode,
                    responseTime: `${responseTime}ms`,
                    params: req.params,
                    query: req.query,
                };

                // POST 요청인 경우 body 데이터 추가
                if (method === 'POST') {
                    logData.body = req.body;

                    // 파일 첨부 확인 및 처리
                    if (req.files) {
                        logData.files = Object.keys(req.files).map((fieldname) => {
                            const file = req.files[fieldname];
                            const fileInfo = Array.isArray(file) ? file[0] : file;
                            return {
                                fieldname,
                                filename: fileInfo.originalname,
                                extension: _path.extname(fileInfo.originalname).substring(1),
                                size: `${Math.round(fileInfo.size / 1024)}KB`,
                            };
                        });
                    }
                }

                logger.info(`${method} ${logData.path} completed`, logData);
            }
        } catch (error) {
            // 에러 정보 수집
            const errorInfo = {
                url: req.originalUrl,
                method,
                path,
                params: req.params,
                query: req.query,
                body: req.body,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                },
                location: error.stack ? error.stack.split('\n')[1].trim() : 'Unknown location',
            };

            // 에러 로그 기록
            logger.error(`Error in ${method} ${path}`, errorInfo);

            // 클라이언트에 응답
            res.status(500).json(Format.internalError(error.message));
        }
    });

    // 래핑된 핸들러 표시
    wrappedHandler.__wrapped = true;

    return [...middlewares, wrappedHandler];
}

module.exports = { wrapRouter };
