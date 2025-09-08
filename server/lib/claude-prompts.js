// Claude 4.0 Sonnet에게 보낼 통합 프롬프트
const createComprehensiveAnalysisPrompt = (documentType = 'auto') => {
    return `
# 문제지 완전 구조화 및 이미지 추출 분석

다음 문제지 이미지들을 분석하여 **완전한 구조화된 데이터**와 **모든 시각적 요소의 정확한 좌표**를 추출해주세요.

## ⚠️ 중요: JSON 응답 규칙

    **반드시 유효한 JSON만 생성하세요. 다음 규칙을 엄격히 준수하세요:**

    1. **문자열에서 특수문자 이스케이프**: "He said \\"Hello\\"" (따옴표를 \\로 이스케이프)
    2. **줄바꿈 제거**: 모든 텍스트에서 \\n, \\r 제거
    3. **배열 마지막 요소 후 쉼표 없음**: [1, 2, 3] (3 뒤에 쉼표 X)
    4. **객체 마지막 속성 후 쉼표 없음**: {"a": 1, "b": 2} (2 뒤에 쉼표 X)

## 📋 분석 요구사항

### 1. 문서 메타데이터 추출
    - 시험년도, 시험유형, 과목명, 교시
    - 출제기관, 저작권 정보
    - 문제 범위

### 2. 문항별 완전 구조화
    각 문항에 대해:
        - 문항 번호
    - 문제 텍스트
    - 모든 선택지 (①②③④⑤)
    - 특수 기호 (㉠㉡㉢, ⓐⓑⓒ 등)

### 3. 시각적 요소 좌표 매핑
    - **표**: 실험 데이터, 통계표 등
    - **그래프**: 선그래프, 막대그래프 등
    - **도식**: 과정도, 구조도 등
    - **그림**: 실험 장치, 사진 등

## 📐 좌표 정확도 요구사항

    - **절대 좌표**: 페이지 기준 픽셀 단위
    - **여백 포함**: 크롭 가능하도록 여백 포함
    - **최소 크기**: 50x50px 이상만 포함

## 📤 JSON 응답 형식

    **반드시 이 정확한 구조로만 응답하세요. 추가 설명 없이 JSON만 반환하세요.**

\`\`\`json
{
  "metadata": {
    "documentType": "korean",
    "year": "2026",
    "examType": "수능",
    "subject": "국어",
    "period": 1,
    "institution": "한국교육과정평가원",
    "totalPages": 2,
    "hasImages": true,
    "imageCount": 3
  },
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "윗글의 내용과 일치하지 않는 것은?",
      "passage": "지문 내용 요약 (200자 이내)",
      "choices": [
        {
          "number": "①",
          "text": "선택지 1 내용"
        },
        {
          "number": "②",
          "text": "선택지 2 내용"
        },
        {
          "number": "③",
          "text": "선택지 3 내용"
        },
        {
          "number": "④",
          "text": "선택지 4 내용"
        },
        {
          "number": "⑤",
          "text": "선택지 5 내용"
        }
      ],
      "specialMarkers": {
        "circledNumbers": ["㉠", "㉡"],
        "specialLetters": ["ⓐ", "ⓑ"]
      },
      "relatedImages": [
        {
          "imageId": "img_q1_table_001",
          "type": "table",
          "description": "실험 결과표",
          "isEssential": true,
          "coordinates": {
            "pageNumber": 1,
            "x": 150,
            "y": 300,
            "width": 400,
            "height": 200
          }
        }
      ],
      "questionType": "reading_comprehension",
      "difficulty": "standard"
    }
  ],
  "allImages": [
    {
      "imageId": "img_q1_table_001",
      "questionNumber": 1,
      "type": "table",
      "description": "실험 결과표",
      "isEssential": true,
      "coordinates": {
        "pageNumber": 1,
        "x": 150,
        "y": 300,
        "width": 400,
        "height": 200
      }
    }
  ]
}
\`\`\`

## 🚨 JSON 검증 체크리스트

응답하기 전에 반드시 확인:
- [ ] 모든 문자열이 따옴표로 감싸져 있는가?
- [ ] 배열/객체 마지막에 불필요한 쉼표가 없는가?
- [ ] 특수문자가 올바르게 이스케이프되었는가?
- [ ] 중괄호와 대괄호가 올바르게 닫혀있는가?
- [ ] 텍스트에 줄바꿈이나 제어문자가 없는가?

**중요: 응답에는 JSON만 포함하고, 추가 설명이나 마크다운 없이 순수 JSON만 반환하세요.**
`;
};

// 사용 예시 함수
async function analyzeWithClaudeComprehensive(pageImages, documentType = 'auto') {
    const prompt = createComprehensiveAnalysisPrompt(documentType);

    try {
        // 이미지 데이터 준비 (base64 인코딩)
        const imageData = pageImages.map(img => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: 'image/png',
                data: fs.readFileSync(img.path, { encoding: 'base64' })
            }
        }));

        const payload = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 8000, // 더 긴 응답을 위해 증가
            temperature: 0.1, // 정확성을 위해 낮은 temperature
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        ...imageData
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0', // Claude 4.0 Sonnet
            contentType: 'application/json',
            body: JSON.stringify(payload)
        });

        const response = await this.bedRockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // JSON 응답 추출 및 파싱
        const analysisText = responseBody.content[0].text;
        console.log('Claude raw response:', analysisText);

        // JSON 블록 추출 (```json으로 감싸진 경우 처리)
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) ||
            analysisText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const jsonText = jsonMatch[1] || jsonMatch[0];
            const parsedResult = JSON.parse(jsonText);

            // 결과 검증
            if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
                throw new Error('Invalid response format: questions array missing');
            }

            if (!parsedResult.allImages || !Array.isArray(parsedResult.allImages)) {
                console.warn('No images detected in the document');
                parsedResult.allImages = [];
            }

            return parsedResult;
        } else {
            throw new Error('No valid JSON found in Claude response');
        }

    } catch (error) {
        console.error('Claude comprehensive analysis failed:', error);
        throw error;
        /*
        Fallback: 기본 구조 반환
        return {
            metadata: {
                documentType: documentType,
                hasImages: false,
                error: error.message
            },
            questions: [],
            allImages: [],
            analysisQuality: {
                textExtractionAccuracy: "0%",
                imageDetectionRate: "0%",
                coordinateAccuracy: "failed",
                completenessScore: "0%",
                processingNotes: [`Analysis failed: ${error.message}`]
            }
        };
        */
    }
}

// 응답 검증 함수
function validateClaudeResponse(response) {
    const errors = [];
    const warnings = [];

    // 기본 구조 검증
    if (!response.metadata) errors.push('metadata 섹션 누락');
    if (!response.questions || !Array.isArray(response.questions)) {
        errors.push('questions 배열 누락');
    }
    if (!response.allImages || !Array.isArray(response.allImages)) {
        warnings.push('allImages 배열 누락 - 이미지가 없는 문서일 수 있음');
    }

    // 문항 검증
    response.questions?.forEach((question, index) => {
        if (!question.questionNumber) {
            errors.push(`문항 ${index + 1}: questionNumber 누락`);
        }
        if (!question.questionText) {
            errors.push(`문항 ${index + 1}: questionText 누락`);
        }
        if (!question.choices || question.choices.length !== 5) {
            warnings.push(`문항 ${index + 1}: 선택지가 5개가 아님 (${question.choices?.length || 0}개)`);
        }

        // 선택지 번호 검증
        const expectedChoices = ['①', '②', '③', '④', '⑤'];
        const actualChoices = question.choices?.map(c => c.number) || [];
        const missingChoices = expectedChoices.filter(c => !actualChoices.includes(c));
        if (missingChoices.length > 0) {
            warnings.push(`문항 ${index + 1}: 누락된 선택지 번호: ${missingChoices.join(', ')}`);
        }
    });

    // 이미지 좌표 검증
    response.allImages?.forEach((image, index) => {
        if (!image.coordinates) {
            errors.push(`이미지 ${index + 1}: coordinates 누락`);
        } else {
            const { x, y, width, height } = image.coordinates;
            if (typeof x !== 'number' || typeof y !== 'number' ||
                typeof width !== 'number' || typeof height !== 'number') {
                errors.push(`이미지 ${index + 1}: 좌표가 숫자가 아님`);
            }
            if (width <= 0 || height <= 0) {
                errors.push(`이미지 ${index + 1}: 잘못된 크기 (${width}x${height})`);
            }
        }

        if (!image.questionNumber) {
            warnings.push(`이미지 ${index + 1}: 연관 문항 번호 누락`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        quality: {
            questionCount: response.questions?.length || 0,
            imageCount: response.allImages?.length || 0,
            completeness: errors.length === 0 ? '완전' : '불완전'
        }
    };
}

// 결과 후처리 함수
function postProcessClaudeResponse(response) {
    // 1. 문항 번호 순서 정렬
    response.questions.sort((a, b) => a.questionNumber - b.questionNumber);

    // 2. 이미지 ID 자동 생성 (누락된 경우)
    response.allImages.forEach((image, index) => {
        if (!image.imageId) {
            image.imageId = `img_q${image.questionNumber}_${image.type}_${String(index).padStart(3, '0')}`;
        }
    });

    // 3. 문항별 이미지 연결
    response.questions.forEach(question => {
        if (!question.relatedImages) {
            question.relatedImages = response.allImages.filter(
                img => img.questionNumber === question.questionNumber
            );
        }
        question.hasImages = question.relatedImages.length > 0;
        question.imageCount = question.relatedImages.length;
    });

    // 4. 메타데이터 보완
    if (!response.metadata.questionRange) {
        const questionNumbers = response.questions.map(q => q.questionNumber);
        if (questionNumbers.length > 0) {
            response.metadata.questionRange = `${Math.min(...questionNumbers)}-${Math.max(...questionNumbers)}`;
        }
    }

    response.metadata.imageCount = response.allImages.length;
    response.metadata.hasImages = response.allImages.length > 0;

    return response;
}

module.exports = {
    createComprehensiveAnalysisPrompt,
    analyzeWithClaudeComprehensive,
    validateClaudeResponse,
    postProcessClaudeResponse
};