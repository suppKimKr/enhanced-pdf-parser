module.exports = {
    secret: {
        accessToken: {
            key: 'e041d8fdec689dad193b296fb36ab7becbf0ad6bbd867454d37ef8d312b227d6c6',
            expiresIn: '1h',
            expiresInSec: 60 * 60 * 24,
        },
        refreshToken: {
            key: '976668af72f4842e463c83fd926ba291f1838cf35b0beb11240a09cc189c9b12eb',
            expiresIn: '7d',
            expiresInSec: 60 * 60 * 24 * 7,
        },
    },
    redisPrefix: {
        user: 'SCORE:ADMIN:%s:USER',
        token: 'SCORE:ADMIN:%s:TOKEN',
        verifyCodeSms: 'SCORE:VERIFY:CODE:SMS:%s',
        channel: {
            all: 'SCORE:%s',
            push: 'SCORE:PUSH:%s',
            chat: 'SCORE:CHAT:%s',
            biztalk: 'SCORE:BIZTALK:%s',
            slack: 'SCORE:SLACK:%s',
            live: 'SCORE:LIVE:%s',
            cast: 'SCORE:CAST:%s',
            match: {
                event: 'SCORE:MATCH:%s:EVENT:%s',
                upComingEvents: 'SCORE:MATCH:DATE:%s',
                new: 'SCORE:MATCH:NEW:%s',
                fetching: 'SCORE:MATCH:EVENT:%s:FETCHING',
            },
            punishment: 'SCORE:PUNISH:%s',
        },
        punishment: 'SCORE:PUNISH:%s',
    },
    imagePathPrefix: {
        s3: 'https://image.dodolabs.kr/',
    },
};
