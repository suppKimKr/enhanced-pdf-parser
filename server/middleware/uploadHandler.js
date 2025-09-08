const multer = require('multer');

const allowedMimeTypes = (fileType) => {
    switch (fileType) {
        case 'pdf':
            return [
                'application/pdf',
            ];
        case 'image':
            return [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
            ];
        case 'document':
            return [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
        case 'video':
            return [
                'video/mp4',
                'video/avi',
                'video/mov'
            ];
        default:
            return []; // 빈 배열 반환 (모든 파일 거부)
    }
}

// 동적 파일 타입 필터링 함수 생성
const createFileFilter = (fileType) => {
    return (req, file, cb) => {
        const allowedTypes = allowedMimeTypes(fileType);
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true); // 파일 허용
        } else {
            cb(new Error(`허용되지 않는 파일 형식입니다. 허용되는 타입: ${fileType}`), false); // 파일 거부
        }
    };
};

const upload = (fileType) => multer({
    storage: multer.memoryStorage(),
    fileFilter: createFileFilter(fileType)
});

module.exports = upload;