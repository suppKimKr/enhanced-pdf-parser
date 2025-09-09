# Enhanced PDF Parser

AWS Bedrock(Claude)와 이미지 처리 파이프라인을 활용해 PDF에서 구조화된 데이터와 이미지를 추출하는 Node.js 서비스입니다. 본 문서는 현재 프로젝트 구조와 실제 동작 방식에 맞춰 정리되었습니다.

## 개요
- PDF를 고해상도 이미지로 변환한 뒤, Claude 모델을 통해 문서 내용을 분석합니다.
- 문제(문항) 추출 및 문서 내 이미지 좌표를 기반으로 이미지 크롭/업로드를 수행합니다.
- 결과를 구조화된 형태로 반환하며, 필요 시 외부 저장소/데이터베이스와 연동할 수 있습니다.

## 폴더 구조
프로젝트 루트 기준:
- app.js: 애플리케이션 엔트리 포인트(Express 서버 기동)
- config/
  - default.json: 설정 파일(포트, DB, AWS 등)
  - environment.js: Express 미들웨어, CORS 등 환경 설정
  - routes.js: 라우트 바인딩(/health, /v1/service/parser)
- server/
  - controllers/
    - health.js: 헬스 체크
    - parser.js: PDF 파싱 API (파일 업로드)
  - services/
    - parserClass.js: 문서 유형별 파서 연결 로직
  - lib/
    - exam_pdf_parser.js: 실제 PDF 처리/이미지 추출/Bedrock 호출 로직
    - index.js: 공용 유틸(logger, JWT 검증, 요청 합치기 등)
    - mapper/request/parser.js: 요청 스키마
    - redis_client.js: Redis 연결 유틸(옵셔널)
  - middleware/
    - uploadHandler.js: multer 메모리 업로더(파일 타입 필터)
    - routeWrapper.js, asyncHandler.js, errorHandler.js: 라우터 래핑/에러 처리 등
  - constants/index.js: 토큰 키, 이미지 URL prefix, 문서 타입 상수
- temp/: 작업 중 생성되는 파일 보관(개발 환경)

## 설치 및 실행
### 요구 사항
- Node.js LTS 권장
- (선택) Redis, MongoDB, MySQL — 기능 확장 시 사용
- AWS 계정 및 Bedrock/S3 권한

### 설치
```bash
npm install
```

### 실행
```bash
node app.js
# 또는 디버그 모드
npm run debug
```
서버가 시작되면 로그에 포트가 출력됩니다. 기본 포트는 config/default.json의 app.port(기본 3993)입니다.

## 설정(config)
설정은 config/default.json을 사용합니다. 실 환경에서는 config/production.json 으로 관리합니다.

예시(민감정보는 예시값으로 대체):
```json
{
  "app": {
    "env": "default",
    "name": "enhanced-pdf-parser",
    "version": "v1",
    "domain": "http://localhost:3993/",
    "port": 3993
  },
  "database": {
    "mysql": {
      "host": "localhost",
      "dbname": ["dev", "dev"],
      "user": "admin",
      "password": "<your-mysql-password>",
      "protocol": "mysql",
      "port": "3306",
      "logging": true
    },
    "redis": {
      "port": 6379,
      "host": "localhost",
      "db": 0
    },
    "mongo": {
      "host": "<your-mongodb-connection-string>",
      "db": "nodejs"
    }
  },
  "aws": {
    "region": "ap-northeast-2",
    "accessKey": "<your-access-key>",
    "secretAccessKey": "<your-secret-access-key>",
    "s3Image": "<your-s3-image-bucket>",
    "s3Match": "<your-s3-match-bucket>",
    "s3ImageUrl": "https://image.example.com/",
    "s3Repository": "dev",
    "bedrock": {
      "modelId": "arn:aws:bedrock:ap-northeast-2:xxxxxxxxxxxx:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0"
    }
  }
}
```
참고: JWT 관련 비밀키는 server/constants/index.js에서 사용됩니다. 실제 서비스에서는 안전한 비밀 관리로 대체하세요.

## API
### 베이스 경로
- 헬스 체크: GET /health
- 파서: POST /v1/service/parser/parse
  - routes.js에서 apiPrefix는 `/${config.app.version}/service` 이므로 기본값(v1) 기준 `/v1/service/parser`입니다.

### 요청 형식(파일 업로드)
- Content-Type: multipart/form-data
- 필드
  - file: PDF 파일(필수)
  - documentType: 문자열(선택, 기본 exam)

### 예시(curl)
```bash
curl -X POST "http://localhost:3993/v1/service/parser/parse" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/file.pdf" \
  -F "documentType=exam"
```

### 응답 형식
컨트롤러는 response-format을 사용합니다. 성공 시 예시:
```json
{
  "success": true,
  "message": null,
  "data": {
    "processingId": "123e4567-e89b-12d3-a456-426614174000",
    "questions": [],
    "allImages": []
  }
}
```
파일이 없을 경우 400과 함께 `{ success: false, message: "file is required" }`가 반환됩니다.

## 라이브러리로 사용(프로그램에서 직접 호출)
server/lib/exam_pdf_parser를 직접 사용할 수 있습니다:
```js
const { ExamPDFParserWithImages } = require('./server/lib/exam_pdf_parser');
const fs = require('fs');

(async () => {
  const parser = new ExamPDFParserWithImages();
  const pdfBuffer = fs.readFileSync('/path/to/document.pdf');
  const result = await parser.processPDFWithImages(pdfBuffer);
  console.log(result);
})();
```

## 의존성(주요)
- express, multer, cors, body-parser
- aws sdk(v3) for S3/Bedrock
- pdf-to-png-converter, canvas, sharp
- response-format, lodash, winston(로그)
- (선택) ioredis, mongoose, sequelize, mysql2

## 참고 사항
- data/example.json 파일은 반환된(구조화된) data의 예시 파일입니다.
- temp/ 디렉터리는 변환/처리 과정 중 임시 파일이 생성될 수 있습니다.
- Redis/Mongo/MySQL은 선택 사항이며, 프로젝트 확장 시에만 필요합니다.
- Bedrock 및 S3 권한이 올바르게 설정되어야 실제 업로드/추론이 동작합니다.

## 성능 개선 및 활용시 주의 사항
- /server/lib/prompts/exam.js 파일의 prompt 수정을 통해 AWS Bedrock(Claude)의 input/output 을 조정하여 커스텀할 수 있습니다.
- 1.0 버전이므로 사용 환경과 성능 요구치에 맞게 개선이 필요합니다.
- /server/lib > sendToBatch 함수를 활용하여 redis pub/sub을 MQ로, 파싱 및 저장 완료 시 알림 로직을 추가구현하여 사용자 경험을 향상시키길 권장합니다.  

## 라이선스 / 기여
- 내부용(Private). 외부 배포 금지.
- 기여가 필요하면 리포지토리 오너에게 문의하세요.