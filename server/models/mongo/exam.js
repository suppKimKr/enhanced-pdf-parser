/*
processingId,
                documentType: claudeResult.metadata?.documentType || 'unknown',
                metadata: {
                    ...claudeResult.metadata,
                    processingDate: new Date().toISOString(),
                    totalImageCount: uploadedImages.length,
                    s3Bucket: this.config.aws.s3.bucket,
                    claudeModelUsed: this.config.aws.bedrock.modelId
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
 */

module.exports = (mongoose) => {
    const { Schema } = mongoose;

    const examSchema = new Schema({
        processingId: {
            type: String,
        },
        documentType: {
            type: String,
        },
        metadata: {
            type: Object,
        },
        allImages: {
            type: Array,
            items: {
                type: Object,
            },
        },
        questions: {
            type: Array,
            items: {
                type: Object,
            },
        },
        analysisQuality: {
            type: Object,
        },
        performance: {
            type: Object,
        },
        searchableText: {
            typeL: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    });

    return mongoose.model('EXAM', examSchema);
};
