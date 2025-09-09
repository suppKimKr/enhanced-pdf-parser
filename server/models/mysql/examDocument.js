const Sequelize = require('sequelize');

module.exports = (db) => {
    const examDocument = db.define(
        'examDocument',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            processingId: {
                type: Sequelize.STRING,
                field: 'processing_id',
            },
            documentType: {
                type: Sequelize.STRING,
                field: 'document_type',
            },
            metadata: {
                type: Sequelize.JSON,
            },
            totalQuestions: {
                type: Sequelize.INTEGER,
                field: 'total_questions',
            },
            totalImages: {
                type: Sequelize.INTEGER,
                field: 'total_images',
            },
            s3Bucket: {
                type: Sequelize.STRING,
                field: 's3_bucket',
            },
            createdAt: {
                type: Sequelize.DATE,
                field: 'created_at',
            },
            deletedAt: {
                type: Sequelize.DATE,
                field: 'deleted_at',
            },
        },
        {
            validations: {},
            methods: {},
            tableName: 'EXAM_DOCUMENT',
            paranoid: true,
            updatedAt: false,
            timestamps: true,
            underscored: false,
        }
    );

    return examDocument;
};
