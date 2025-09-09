const path = require('path');
const constants = require('../constants');
const fs = require('fs');
const { v4: uuidv4} = require('uuid');
const { pdfToPng } = require('pdf-to-png-converter');
const { createCanvas, loadImage } = require('canvas');
const {logger} = require("./index");
const {PutObjectCommand} = require("@aws-sdk/client-s3");
const { mongodb: __mongodb__, mysql: __mySql__, sequelize } = require('../models');
const { S3Client, BedrockClient } = require("./aws");
const _ = require("lodash");
const { InvokeModelWithResponseStreamCommand } = require("@aws-sdk/client-bedrock-runtime");

class ExamPDFParserWithImages {
    constructor() {
        this._s3Client = S3Client();
        this._bedrockClient = BedrockClient();
        this._tempDir = './temp';

        if (!fs.existsSync(this._tempDir)) {
            fs.mkdirSync(this._tempDir, { recursive: true });
        }
    }

    /**
     * Claude 4.0이 모든 구조화 + 이미지 좌표를 한번에 처리
     */
    async processPDFWithImages(pdfBuffer) {
        const processingId = uuidv4();
        logger.info(`🚀 Processing started: ${processingId}`);

        try {
            // 1단계: PDF를 고해상도 이미지로 변환
            logger.info('📄 Step 1: Converting PDF to high-resolution images...');
            const pageImages = await this.convertPDFToImages(pdfBuffer, processingId);
            logger.info(`✅ Converted ${pageImages.length} pages to images`);

            // 2단계: Claude 4.0으로 완전한 구조화 분석
            // 텍스트 + 이미지 좌표를 모두 한번에 처리
            logger.info('🤖 Step 2: Claude 4.0 comprehensive analysis...');
            const claudeResult = await this.analyzeWithClaude(pageImages);
            logger.info(`✅ Claude analysis completed: ${claudeResult.questions?.length || 0} questions, ${claudeResult.allImages?.length || 0} images`);

            // 3단계: Claude가 찾은 이미지들을 실제로 크롭하고 S3에 업로드
            logger.info('✂️ Step 3: Cropping and uploading images to S3...');
            const uploadedImages = await this.cropAndUploadImages(
                pageImages,
                claudeResult.allImages || [],
                processingId
            );
            logger.info(`✅ Uploaded ${uploadedImages.length} images to S3`);

            // 4단계: 최종 결과 구성 (문항에 업로드된 이미지 URL 연결)
            logger.info('🔗 Step 4: Linking images to questions...');
            const finalQuestions = this.linkImagesToQuestions(
                claudeResult.questions || [],
                uploadedImages
            );

            // 5단계: 최종 결과 객체 생성
            const finalResult = {
                processingId,
                documentType: claudeResult.metadata?.documentType || 'unknown',
                metadata: {
                    ...claudeResult.metadata,
                    processingDate: new Date().toISOString(),
                    totalImageCount: uploadedImages.length,
                    s3Bucket: config.aws.s3Image,
                    claudeModelUsed: config.aws.bedrock.modelId
                },
                questions: finalQuestions,
                allImages: uploadedImages,
                analysisQuality: claudeResult.analysisQuality || {},
                performance: {
                    totalProcessingTime: Date.now() - Date.parse(new Date().toISOString()),
                    stepsCompleted: 5,
                    successRate: '100%'
                },
                success: true,
                timestamp: new Date().toISOString()
            };

            // 6단계: 데이터베이스 저장
            logger.info('💾 Step 5: Saving to database...');
            await this.saveToDatabase(finalResult);
            logger.info('✅ Data saved to MySQL and MongoDB');

            // 7단계: 임시 파일 정리
            logger.info('🧹 Step 6: Cleaning up temporary files...');
            await this.cleanup(processingId);

            logger.info(`🎉 Processing completed successfully: ${processingId}`);
            logger.info(`📊 Results: ${finalQuestions.length} questions, ${uploadedImages.length} images`);

            return finalResult;

        } catch (e) {
            logger.error(`❌ Processing failed for ${processingId}:`, e);
            await this.cleanup(processingId);
            throw e;
        }
    }

    /**
     * Claude 4.0에서 받은 문항들과 업로드된 이미지들을 연결
     */
    linkImagesToQuestions(claudeQuestions, uploadedImages) {
        logger.info('🔗 Linking images to questions...');

        return claudeQuestions.map(question => {
            // Claude가 이미 relatedImages를 제공했지만, 실제 S3 URL로 교체
            const actualImages = uploadedImages.filter(
                img => img.questionNumber === question.questionNumber
            );

            // Claude 분석 결과와 실제 업로드 결과 매칭
            const enhancedImages = actualImages.map(uploadedImg => {
                // Claude가 제공한 원본 이미지 정보 찾기
                const originalImageInfo = question.relatedImages?.find(
                    relImg => relImg.imageId === uploadedImg.imageId
                ) || {};

                return {
                    ...originalImageInfo, // Claude가 분석한 정보
                    ...uploadedImg,       // 실제 업로드된 S3 정보
                    // 추가 메타데이터
                    uploadedAt: new Date().toISOString(),
                    processingStatus: 'completed'
                };
            });

            return {
                ...question,
                images: enhancedImages,
                hasImages: enhancedImages.length > 0,
                imageCount: enhancedImages.length,
                imageTypes: enhancedImages.map(img => img.type),
                hasEssentialImages: enhancedImages.some(img => img.isEssential),
                // 이미지 관련 추가 정보
                imageStatistics: {
                    totalImages: enhancedImages.length,
                    imagesByType: this.groupImagesByType(enhancedImages),
                    totalImageSize: enhancedImages.reduce((sum, img) =>
                        sum + (img.dimensions?.width * img.dimensions?.height || 0), 0)
                }
            };
        });
    }

    /**
     * 이미지를 타입별로 그룹화
     */
    groupImagesByType(images) {
        return images.reduce((acc, img) => {
            acc[img.type] = (acc[img.type] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * 이미지 크롭 및 업로드
     */
    async cropAndUploadImages(pageImages, claudeImages, processingId) {
        logger.info(`✂️ Cropping ${claudeImages.length} images...`);

        const uploadResults = [];
        const uploadPromises = []; // 병렬 업로드를 위한 Promise 배열

        for (const imageInfo of claudeImages) {
            // 각 이미지를 병렬로 처리
            const uploadPromise = this.processSingleImage(pageImages, imageInfo, processingId);
            uploadPromises.push(uploadPromise);
        }

        try {
            // 모든 이미지를 병렬로 처리
            const results = await Promise.allSettled(uploadPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    uploadResults.push(result.value);
                    logger.info(`✅ Image ${index + 1}/${claudeImages.length} processed: ${result.value.imageId}`);
                } else {
                    logger.error(`❌ Image ${index + 1}/${claudeImages.length} failed:`, result.reason.message);
                    // 개별 이미지 실패는 전체 처리를 중단하지 않음
                }
            });

            logger.info(`📊 Upload summary: ${uploadResults.length}/${claudeImages.length} images successful`);
            return uploadResults;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 단일 이미지 처리 (크롭 + 업로드)
     */
    async processSingleImage(pageImages, imageInfo, processingId) {
        try {
            // 해당 페이지 이미지 찾기
            const pageImage = pageImages.find(p => p.pageNumber === imageInfo.coordinates.pageNumber);
            if (!pageImage) {
                throw new Error(`Page ${imageInfo.coordinates.pageNumber} not found`);
            }

            // 원본 이미지 로드
            const originalImage = await loadImage(pageImage.path);

            // 크롭 영역 계산 (여백 추가로 안전하게)
            const { x, y, width, height } = imageInfo.coordinates;
            const padding = 0; // 넉넉한 여백

            const cropX = Math.max(0, x - padding);
            const cropY = Math.max(0, y - padding);
            const cropWidth = Math.min(originalImage.width - cropX, width + padding * 2);
            const cropHeight = Math.min(originalImage.height - cropY, height + padding * 2);

            // 최소 크기 검증
            if (cropWidth < 50 || cropHeight < 50) {
                throw new Error(`Image too small: ${cropWidth}x${cropHeight}`);
            }

            // Canvas로 크롭
            const canvas = createCanvas(cropWidth, cropHeight);
            const ctx = canvas.getContext('2d');

            // 고품질 렌더링 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
                originalImage,
                cropX, cropY, cropWidth, cropHeight,  // 소스 영역
                0, 0, cropWidth, cropHeight           // 대상 영역
            );

            // PNG 버퍼 생성 (고품질)
            const croppedBuffer = canvas.toBuffer('image/png', { compressionLevel: 6 });

            // S3 업로드용 키 생성
            const timestamp = Date.now();
            const imageKey = `exam-images/${processingId}/q${imageInfo.questionNumber}/${imageInfo.type}_${imageInfo.imageId}_${timestamp}.png`;

            // S3 업로드
            const uploadResult = await this.uploadToS3(croppedBuffer, imageKey, {
                questionNumber: imageInfo.questionNumber,
                imageType: imageInfo.type,
                originalImageId: imageInfo.imageId
            });

            // 결과 객체 생성
            return {
                imageId: imageInfo.imageId,
                questionNumber: imageInfo.questionNumber,
                type: imageInfo.type,
                description: imageInfo.description,
                isEssential: imageInfo.isEssential || true,
                url: uploadResult.url,
                s3Key: imageKey,
                dimensions: {
                    width: cropWidth,
                    height: cropHeight,
                    originalWidth: width,
                    originalHeight: height
                },
                originalCoordinates: imageInfo.coordinates,
                contentAnalysis: imageInfo.contentAnalysis || {},
                fileSize: croppedBuffer.length,
                uploadedAt: new Date().toISOString(),
                processingMetadata: {
                    cropPadding: padding,
                    qualitySettings: 'high',
                    compressionLevel: 6
                }
            };

        } catch (e) {
            logger.error(`Failed to process image ${imageInfo.imageId}:`, e);
            throw e;
        }
    }

    /**
     * S3 업로드 (메타데이터 포함)
     */
    async uploadToS3(buffer, key, metadata = {}) {
        try {
            const command = new PutObjectCommand({
                Bucket: config.aws.s3Image,
                Key: key,
                Body: buffer,
                ContentType: 'image/png',
                // 메타데이터 추가
                Metadata: {
                    'question-number': String(metadata.questionNumber || ''),
                    'image-type': metadata.imageType || '',
                    'original-image-id': metadata.originalImageId || '',
                    'uploaded-by': 'enhanced-pdf-parser',
                    'version': '2.0'
                },
                // 캐시 설정
                CacheControl: 'max-age=31536000', // 1년
                // 압축 설정
                ContentEncoding: 'identity'
            });

            await this._s3Client.send(command);

            const url = `${constants.imagePathPrefix.s3}${key}`;

            logger.info(`📤 S3 upload successful: ${key}`);
            return { url, key };

        } catch (e) {
            logger.error(`S3 upload failed for ${key}:`, e);
            throw new Error(`S3 upload failed: ${e.message}`);
        }
    }

    /**
     * 데이터베이스 저장 (상세 로깅 포함)
     */
    async saveToDatabase(result) {
        logger.info('💾 Saving to databases...');

        try {
            // 병렬 저장
            await Promise.allSettled([
                this.saveToMySQL(result),
                this.saveToMongoDB(result)
            ]);

            logger.info(`✅ Database save completed: ${result.processingId}`);
            logger.info(`📊 Saved: ${result.questions.length} questions, ${result.allImages.length} images`);

        } catch (e) {
            logger.error('Database save failed:', e);
            throw e;
        }
    }

    /**
     * MySQL 저장
     */
    async saveToMySQL(result) {
        try {
            // 1. 문서 정보 저장
            const docResult = await new __mySql__.examDocument({
                processingId: result.processingId,
                documentType: result.documentType,
                metadata: JSON.stringify(result.metadata),
                totalQuestions: result.questions.length,
                totalImages: result.allImages.length,
                s3Bucket: config.aws.s3Image,
            }).save();

            const documentId = docResult.insertId;
            logger.info(`📄 Document saved with ID: ${documentId}`);

            // 2. 문항별 저장 (배치 처리)
            let questionCount = 0;
            let imageCount = 0;

            for (const question of result.questions) {
                await sequelize.transaction(async (t) => {
                    const questionResult = await new __mySql__.examQuestion({
                            fkDocumentId: documentId,
                            questionNumber: question.questionNumber,
                            questionText: question.questionText,
                            passage: question.passage || '',
                            choices: JSON.stringify(question.choices || []),
                            additionalInfo: JSON.stringify(question.additionalInfo || {}),
                            specialMarkers: JSON.stringify(question.specialMarkers || {}),
                            questionType: question.questionType || 'unknown',
                            difficulty: question.difficulty || 'standard',
                            points: question.points || 2,
                            imageCount: question.imageCount || 0,
                            hasEssentialImages: question.hasEssentialImages || false,
                        }
                    ).save({ transaction: t });

                    const questionId = questionResult.id;
                    questionCount++;

                    // 3. 이미지 정보 저장
                    for (const image of question.images || []) {
                        await new __mySql__.examImage({
                            fkQuestionId: questionId,
                            label: image.imageId,
                            type: image.type,
                            description: image.description,
                            s3Key: image.s3Key,
                            dimensions: JSON.stringify(image.dimensions),
                            coordinates: JSON.stringify(image.originalCoordinates),
                            isEssential: image.isEssential || true,
                            contentAnalysis: JSON.stringify(image.contentAnalysis || {}),
                        }).save({ transaction: t });

                        imageCount++;
                    }

                })
            }

            logger.info(`✅ MySQL save completed: ${questionCount} questions, ${imageCount} images`);

        } catch (e) {
            logger.error('❌ MySQL transaction failed, rolling back:', e);
            throw e;
        }
    }

    /**
     * MongoDB 저장 (전체 문서 구조 보존)
     */
    async saveToMongoDB(result) {
        try {
            // MongoDB에는 전체 구조를 JSON으로 보존
            const mongoDocument = {
                processingId: result.processingId,
                ...result,
                searchableText: this.createSearchableText(result),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await __mongodb__.exam.insertOne(mongoDocument);
            logger.info(`✅ MongoDB save completed: ${result.processingId}`);

        } catch(e) {
            logger.error('❌ MongoDB save failed:', e);
            throw e;
        }
    }

    /**
     * 검색을 위한 텍스트 생성
     */
    createSearchableText(result) {
        const texts = [];

        // 메타데이터에서 검색 가능한 텍스트 추출
        if (result.metadata) {
            texts.push(result.metadata.subject || '');
            texts.push(result.metadata.year || '');
            texts.push(result.metadata.examType || '');
        }

        // 모든 문항의 텍스트 합치기
        result.questions.forEach(q => {
            texts.push(q.questionText || '');
            texts.push(q.passage || '');
            q.choices?.forEach(choice => texts.push(choice.text || ''));
        });

        return texts.join(' ').trim();
    }

    // 기타 유틸리티 메서드들 (convertPDFToImages, cleanup)
    async cleanup(processingId) {
        try {
            const processingDir = path.join(this._tempDir, processingId);
            const pdfPath = path.join(this._tempDir, `${processingId}.pdf`);

            // 임시 파일들 삭제
            if (fs.existsSync(processingDir)) {
                fs.rmSync(processingDir, { recursive: true, force: true });
            }

            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }

            logger.info(`Cleanup completed for ${processingId}`);
        } catch (e) {
            logger.error(`Cleanup failed for ${processingId}:`, e);
        }
    }

    async convertPDFToImages(pdfBuffer, processingId) {
        const pdfPath = path.join(this._tempDir, `${processingId}.pdf`);
        const outputDir = path.join(this._tempDir, processingId);

        // PDF 파일 임시 저장
        fs.writeFileSync(pdfPath, pdfBuffer);
        fs.mkdirSync(outputDir, { recursive: true });

        const options = {
            outputFolder: outputDir,
            outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
            viewportScale: 1.5,
        };

        try {
            const pngPages = await pdfToPng(pdfPath, options);

            // 생성된 이미지 파일들 수집
            const imageFiles = _.map(pngPages, (file) => {
                    return {
                        path: path.join(outputDir, file.name),
                        pageNumber: file.pageNumber,
                        filename: file,
                    }
                });

            return imageFiles;
        } catch (e) {
            throw new Error(`PDF to image conversion failed: ${e.message}`);
        }
    }

    async analyzeWithClaude(pageImages) {
        const {
            createComprehensiveAnalysisPrompt,
            validateClaudeResponse,
            postProcessClaudeResponse
        } = require(`./prompts/exam`);

        const analysisPrompt = createComprehensiveAnalysisPrompt();

        try {
            // Claude 4.0 Sonnet에게 png로 변환된 pdf파일의 완전한 구조화 분석 요청
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
                max_tokens: 50000, // 20k - 대략 A4 기준 30페이지 분량. maximum 200k tokens allowed
                temperature: 0.1,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: analysisPrompt },
                            ...imageData
                        ]
                    }
                ]
            };

            const command = new InvokeModelWithResponseStreamCommand({
                modelId: config.aws.bedrock.modelId,
                contentType: 'application/json',
                body: JSON.stringify(payload)
            });

            const response = await this._bedrockClient.send(command);

            // JSON 응답 추출 및 파싱
            let completeMessage = '';
            let chunk;
            for await (const item of response.body) {
                chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
                if ('content_block_delta' === chunk?.type) {
                    completeMessage += chunk.delta.text;
                }
            }

            // JSON 블록 추출 (```json으로 감싸진 경우 처리)
            logger.info(`✅ Cluade Response Content: ${completeMessage}`);
            const jsonMatch = completeMessage.match(/```json\s*([\s\S]*?)\s*```/) ||
                completeMessage.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const jsonText = jsonMatch[1] || jsonMatch[0];
                const parsedResult = JSON.parse(jsonText);

                // 응답 검증
                const validation = validateClaudeResponse(parsedResult);
                logger.info('Claude response validation:', validation);

                if (!validation.isValid) {
                    console.warn('Claude response validation failed:', validation.errors);
                    // 부분적으로라도 사용 가능한 데이터가 있으면 진행
                }

                // 후처리 적용
                const processedResult = postProcessClaudeResponse(parsedResult);

                return processedResult;
            } else {
                throw new Error('No valid JSON found in Claude response');
            }

        } catch (e) {
            logger.error('Claude comprehensive analysis failed:', e);
            throw e;
            /* Fallback: 기본 구조 반환
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
}

module.exports = { ExamPDFParserWithImages };