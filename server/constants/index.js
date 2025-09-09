module.exports = {
    secret: {
        accessToken: {
            key: 'AF4C99A68C300000D259204D80CCA9D14CD984776E2B8E9B7E63834E39426BB3',
            expiresIn: '1h',
            expiresInSec: 60 * 60 * 24,
        },
        refreshToken: {
            key: '27BE8705CF250CBF0842E74CB321EB9FE72A7438B150ACC4A124D52643AB1083',
            expiresIn: '7d',
            expiresInSec: 60 * 60 * 24 * 7,
        },
    },
    imagePathPrefix: {
        s3: 'https://image.dodolabs.kr/',
    },
    // pdf 파싱할 문서 유형. 유형 개발시 lib/prompts에 파일 생성.
    documentType: {
        EXAM: 'exam',
    },
};
