const Sequelize = require('sequelize');

module.exports = (db) => {
    const exam = db.define(
        'exam',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
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
            tableName: 'ALARM',
            paranoid: true,
            updatedAt: false,
            timestamps: true,
            underscored: false,
        }
    );

    return exam;
};
