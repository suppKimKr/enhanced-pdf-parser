const jwt = require('jsonwebtoken');
const Format = require('response-format');
const _ = require('lodash');
const crypto = require('crypto');

const constants = require('../constants');

const redis = require('./redis_client');
const { Types } = require('mongoose');
const util = require('util');

const logger = require('./logger');
module.exports.logger = logger;

const newRedis = new redis();
const redisClient = newRedis.getConnection();
module.exports.redisClient = redisClient;

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
            } else {
                const lastLoginFcmToken = await redisClient.get(util.format(constants.redisPrefix.fcmToken, decoded.id));
                if (lastLoginFcmToken !== decoded.fcmToken) {
                    res.status(401).json(Format.unAuthorized());
                    return;
                }
                res.user = decoded;
                next();
            }
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

const getFilePathFromFields = function (fields, objArray) {
    if (objArray.length) {
        let resultArr = _.assign(objArray);
        return resultArr.map((result) => {
            fields.forEach((field) => {
                function recursion(target, field) {
                    const fieldArr = field.split('.');
                    const depth = fieldArr.length;
                    if (depth > 1) {
                        recursion(result[fieldArr[0]], fieldArr.splice(1, depth).toString());
                    }
                    target[field] = `${constants.imagePathPrefix.s3}${target[field]}`;
                }
                recursion(result, field);
            });
            return result;
        });
    } else return objArray;
};
module.exports.getFilePathFromFields = getFilePathFromFields;

const sendToBatch = function (channel, command) {
    logger.debug('Channel', { channel });
    redisClient.publish(channel, JSON.stringify(command));
};
module.exports.sendToBatch = sendToBatch;

const trimAndLowerSearchKeyword = function (str) {
    logger.debug('Search keyword', { keyword: str });

    const _keyword_ = _.chain(str).trim().lowerCase().replace(/ /g, '').value();

    return _keyword_;
};
module.exports.trimAndLowerSearchKeyword = trimAndLowerSearchKeyword;

const generateHMAC = function (key, payload) {
    return crypto.createHmac('sha256', key).update(payload).digest('base64');
};
module.exports.generateHMAC = generateHMAC;

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
