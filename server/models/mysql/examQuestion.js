const Sequelize = require('sequelize');

module.exports = (db) => {
    const examQuestion = db.define(
        'examQuestion',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            fkDocumentId: {
                type: Sequelize.INTEGER,
                field: 'fk_document_id',
            },
            questionNumber: {
                type: Sequelize.INTEGER,
                field: 'question_number',
            },
            questionText: {
                type: Sequelize.STRING,
                field: 'question_text',
            },
            passage: {
                type: Sequelize.STRING,
            },
            choices: {
                type: Sequelize.STRING,
            },
            additionalInfo: {
                type: Sequelize.STRING,
                field: 'additional_info',
            },
            specialMarkers: {
                type: Sequelize.STRING,
                field: 'special_markers',
            },
            questionType: {
                type: Sequelize.STRING,
                field: 'question_type',
            },
            difficulty: {
                type: Sequelize.STRING,
            },
            points: {
                type: Sequelize.TINYINT,
            },
            imageCount: {
                type: Sequelize.TINYINT,
                field: 'image_count',
            },
            hasEssentialImages: {
                type: Sequelize.BOOLEAN,
                field: 'has_essential_images',
            },
            createdAt: {
                type: Sequelize.DATE,
                field: 'created_at',
            },
        },
        {
            validations: {},
            methods: {},
            tableName: 'EXAM_QUESTION',
            updatedAt: false,
            timestamps: false,
            underscored: false,
        }
    );

    return examQuestion;
};
