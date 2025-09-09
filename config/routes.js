const controllers = require('../server/controllers');
const {logger} = require("../server/lib");
const apiPrefix = `/${config.app.version}/service`;

module.exports = (app) => {
    logger.info('Initializing routes.');

    logger.info(`/health`);
    app.use(`/health`, controllers.health);

    logger.info(`${apiPrefix}/parser`);
    app.use(`${apiPrefix}/parser`, controllers.parser);

    logger.info('\r');
};
