const express = require('express');

const environment = require('./config/environment');
const route = require('./config/routes');
const {logger} = require("./server/lib");

(async () => {
    const server = express();

    await environment(server);
    route(server);

    server.use(function (req, res) {
        res.status(404).send('Sorry cant find that!');
    });

    server.listen(config.app.port, function () {
        logger.info('[%s][%s] (http) listening on port [%s]', global.config.app.env, global.config.app.name, this.address().port);
        logger.info('---------------------------------------------------------------');
    });
})();
