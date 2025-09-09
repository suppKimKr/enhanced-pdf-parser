const Sequelize = require('sequelize');

module.exports = (db) => {
    const examImage = db.define(
        'examImage',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            fkQuestionId: {
                type: Sequelize.INTEGER,
                field: 'fk_question_id',
            },
            label: {
                type: Sequelize.STRING,
            },
            type: {
                type: Sequelize.STRING,
            },
            description: {
                type: Sequelize.STRING,
            },
            s3Key: {
                type: Sequelize.STRING,
                field: 's3_key',
            },
            dimensions: {
                type: Sequelize.STRING,
            },
            coordinates: {
                type: Sequelize.STRING,
            },
            isEssential: {
                type: Sequelize.BOOLEAN,
                field: 'is_essential',
            },
            contentAnalysis: {
                type: Sequelize.STRING,
                field: 'content_analysis',
            },
            createdAt: {
                type: Sequelize.DATE,
                field: 'created_at',
            },
        },
        {
            validations: {},
            methods: {},
            tableName: 'EXAM_IMAGE',
            updatedAt: false,
            timestamps: false,
            underscored: false,
        }
    );

    return examImage;
};
