/**
 * 비동기 라우터 핸들러 래퍼
 * 모든 라우터에서 발생하는 에러를 캐치하여 에러 핸들러로 전달
 * @param {Function} fn 라우터 핸들러 함수
 * @returns {Function} 래핑된 라우터 핸들러 함수
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;