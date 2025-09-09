const jwt = require('jsonwebtoken');
const Format = require('response-format');
const _ = require('lodash');
const constants = require('../constants');
const { Types } = require('mongoose');
const redis = require('./redis_client');
const newRedis = new redis();
const redisClient = newRedis.getConnection();
module.exports.redisClient = redisClient;

const logger = require('./logger');
module.exports.logger = logger;

const signJWT = function (_param_, _secret_, _expires_) {
    try {
        let token = jwt.sign(_param_, _secret_, {
            expiresIn: _expires_,
        });

        return token;
    } catch (e) {
        throw new Error(e);
    }
};
module.exports.signJWT = signJWT;

const decodeToken = function (token) {
    try {
        return jwt.decode(token);
    } catch (e) {
        next();
    }
};
module.exports.decodeToken = decodeToken;

const validAny = async function (req, res, next) {
    try {
        jwt.verify(req.token, constants.secret.accessToken.key, async function (err, decoded) {
            if (!!err) {
                res.user = null;
            } else {
                res.user = decoded;
            }
            next();
        });
    } catch (e) {
        next();
    }
};
module.exports.validAny = validAny;

const validApiToken = async function (req, res, next) {
    try {
        jwt.verify(req.token, constants.secret.accessToken.key, async function (err, decoded) {
            if (!!err) {
                logger.error(`[validApiToken:::error]`, { url: req.originalUrl });
                res.status(401).json(Format.unAuthorized());
                return;
            }
            next();
        });
    } catch (e) {
        res.json(Format.unAuthorized(e.message));
        return;
    }
};
module.exports.validApiToken = validApiToken;

const validRefreshToken = async function (req, res, next) {
    try {
        jwt.verify(req.body.refreshToken, constants.secret.refreshToken.key, async function (err, decoded) {
            if (!!err) {
                logger.error(`[validRefreshToken:::error]`, { url: req.originalUrl });
                res.status(401).json(Format.unAuthorized());
                return;
            } else {
                res.refreshed = decoded;
                next();
            }
        });
    } catch (e) {
        res.json(Format.unAuthorized(e.message));
        return;
    }
};
module.exports.validRefreshToken = validRefreshToken;

const requestCombined = function (req, res, next) {
    logger.info(`[${req.method}][${req.originalUrl}][${req.clientIp}]`);

    try {
        let _combinedReq_ = _.assign({}, req.query, req.params, req.body, { user: res.user || req.user }, { ip: req.clientIp }, { fcmToken: req.headers.fcmtoken });

        req.combined = _combinedReq_;

        next();
    } catch (e) {
        logger.error('Error occurred', { error: e.message, stack: e.stack });
        return;
    }
};
module.exports.requestCombined = requestCombined;

const sendToBatch = function (channel, command) {
    logger.debug('Channel', { channel });
    redisClient.publish(channel, JSON.stringify(command));
};
module.exports.sendToBatch = sendToBatch;

const camelize = function (obj) {
    function camelizeObj(objItem) {
        return _.transform(objItem, (acc, value, key, target) => {
            const camelKey = _.isArray(target) ? key : _.camelCase(key);
            acc[camelKey] = value instanceof Types.ObjectId ? String(value) : value instanceof Date && !isNaN(value) ? value : _.isObject(value) ? camelizeObj(value) : value;
        });
    }

    if (Array.isArray(obj) && _.size(obj)) {
        return _.map(obj, (item) => camelizeObj(item));
    }

    return camelizeObj(obj);
};
module.exports.camelize = camelize;

module.exports.mapper = require('../lib/mapper');