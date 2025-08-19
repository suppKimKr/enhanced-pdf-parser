const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { Sequelize, DataTypes } = require('sequelize');
const mongoose = require('mongoose');

const db = {
    mysql: {},
    mongodb: {},
};

const mysql = new Sequelize(config.database.mysql.dbname[1], null, null, {
    port: config.database.mysql.port,
    dialect: config.database.mysql.protocol,
    logging: !config.database.mysql.logging ? false : console.log,
    // timezone: '+09:00',
    define: {
        freezeTableName: true,
        timestamps: true,
    },
    replication: {
        read: [{ host: config.database.mysql.host[1], username: config.database.mysql.user, password: config.database.mysql.password }],
        write: { host: config.database.mysql.host[0], username: config.database.mysql.user, password: config.database.mysql.password },
    },
    pool: {
        max: 50,
        idle: 10000,
    },
});

const dynamoDB = new dynamoose.aws.ddb.DynamoDB({
    credentials: {
        accessKeyId: config.aws.accessKey,
        secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
});

dynamoose.aws.ddb.set(dynamoDB);

mongoose.set({
    debug: process.env.NODE_ENV !== 'production',
    strictQuery: true,
});
mongoose.connect(config.database.mongo.host, { dbName: config.database.mongo.db });

fs.readdirSync(path.join(__dirname, 'mysql')).forEach(function (file) {
    const _mysql_ = require(path.join(__dirname, 'mysql', file))(mysql, DataTypes);
    db['mysql'][_mysql_.name] = _mysql_;
});

fs.readdirSync(path.join(__dirname, 'mongo'))
    .filter((file) => !_.includes(file, 'Schema'))
    .forEach(function (file) {
        const _mongoDB_ = require(path.join(__dirname, 'mongo', file))(mongoose);
        db['mongodb'][_.camelCase(_mongoDB_.modelName)] = _mongoDB_;
    });

Object.keys(db['mysql']).forEach(function (modelName) {
    if ('associate' in db['mysql'][modelName]) {
        db['mysql'][modelName].associate(db['mysql']);
    }
});

db.sequelize = mysql;

module.exports = db;
