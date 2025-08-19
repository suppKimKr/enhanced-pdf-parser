process.env.NODE_ENV = !!process.env.NODE_ENV ? process.env.NODE_ENV : 'myLocalhost';
global.config = require('config');

const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const bearerToken = require('express-bearer-token');
const cors = require('cors');
const requestIp = require('request-ip');
const {logger} = require("../server/lib");

module.exports = async (app) => {
    app.use(bodyParser.json({ limit: '50mb' }));

    app.use(
        bodyParser.urlencoded({
            limit: '50mb',
            extended: true,
        })
    );

    app.set('jwt-secret', config.secret);

    app.use(requestIp.mw());

    // CORS 설정
    app.use(cors());
    // app.use(
    //     cors({
    //         origin: ['http://localhost:8080', 'http://localhost:3333'],
    //     })
    // );

    app.use(cookieParser());

    app.use(compression());
    app.use(bearerToken());

    app.disable('etag');
    app.disable('x-powered-by');

    /* Sentry
    if (_.includes(['development', 'production'], process.env.NODE_ENV)) {
        Sentry.init({
            dsn: 'https://844fc91714844e7ba45cd262790875c9@o4503901272604672.ingest.sentry.io/4504126929305600',
            integrations: [new Sentry.Integrations.Http({ tracing: true }), new Tracing.Integrations.Express({ app }), new Tracing.Integrations.Mysql()],
            tracesSampleRate: 0.1,
            environment: process.env.NODE_ENV,
            autoSessionTracking: false,
        });
    }

    app.use(Sentry.Handlers.requestHandler({ ip: true, user: ['id'] }));
    app.use(Sentry.Handlers.tracingHandler());
    app.use(
        Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                if (error.status === 500) {
                    return true;
                }
                return false;
            },
        })
    );
    */

    app.set('views', path.join(__dirname, '../server/views'));
    app.set('view engine', 'ejs');

    logger.info('---------------------------------------------------------------');
};
