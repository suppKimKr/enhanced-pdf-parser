const controllers = require('../server/controllers');
const {logger} = require("../server/lib");

module.exports = (app) => {
    logger.info('Initializing routes.');

    logger.info(`/health`);
    app.use(`/health`, controllers.health);

    logger.info('\r');
};
