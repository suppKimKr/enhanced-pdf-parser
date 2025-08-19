const winston = require('winston');
const fs = require('fs');
const path = require('path');
// 일별 로그 파일 로테이션을 위한 모듈 추가
require('winston-daily-rotate-file');

// 로그 디렉토리 생성
const logDir = path.join(process.cwd(), '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 로그 포맷 정의
const logFormat = winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const cleanMessage = message.toString().trimStart();
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';

    const baseMessage = `${timestamp} [${level}]: ${cleanMessage} ${metaStr}`;

    // stack이 있으면 줄바꿈하여 추가
    return stack ? `${baseMessage}\n${stack}` : baseMessage;
});

// 로거 인스턴스 생성
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat()
        // json()과 prettyPrint() 제거
    ),
    defaultMeta: { service: 'vs-score-api-user', environment: process.env.NODE_ENV || 'development' },
    transports: [
        // 콘솔 출력 - colorize를 먼저, printf를 나중에
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // 먼저 색상 적용
                logFormat // 그 다음 포맷 적용
            ),
        }),
        // 에러 로그 파일 출력 - 일별 로테이션
        new winston.transports.DailyRotateFile({
            level: 'error',
            dirname: logDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d', // 30일간 보관
            format: logFormat,
            zippedArchive: true, // 오래된 로그 압축
        }),
        // 모든 로그 파일 출력 - 일별 로테이션
        new winston.transports.DailyRotateFile({
            dirname: logDir,
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d', // 30일간 보관
            format: logFormat,
            zippedArchive: true, // 오래된 로그 압축
        }),
    ],
});

// 개발 환경에서는 더 자세한 로깅
if (process.env.NODE_ENV !== 'production') {
    logger.level = 'debug';
}

// 로그 레벨 별 메서드 정의
module.exports = {
    error: (message, meta = {}) => {
        logger.error(message, meta);
    },
    warn: (message, meta = {}) => {
        logger.warn(message, meta);
    },
    info: (message, meta = {}) => {
        logger.info(message, meta);
    },
    debug: (message, meta = {}) => {
        logger.debug(message, meta);
    },
    // HTTP 요청 로깅을 위한 메서드
    http: (req, res, responseTime) => {
        const { method, originalUrl, ip } = req;
        const statusCode = res.statusCode;

        logger.info(`HTTP ${method} ${originalUrl}`, {
            ip,
            statusCode,
            responseTime: `${responseTime}ms`,
        });
    },
    // 스트림 형태로 사용하기 위한 설정 (morgan과 함께 사용 가능)
    stream: {
        write: (message) => {
            logger.info(message.trim());
        },
    },
};
