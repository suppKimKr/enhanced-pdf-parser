const Redis = require('ioredis');

class redis {
    constructor() {
        this.host = config.database.redis.host;
        this.port = config.database.redis.port;
        this.db = config.database.redis.db;
        this.connected = false;
        this.client = null;
    }
    getConnection() {
        if (this.connected) {
            return this.client;
        } else {
            this.client = new Redis({
                port: config.database.redis.port, // Redis port
                host: config.database.redis.host,
                family: 4, // 4 (IPv4) or 6 (IPv6)
                password: '',
                db: config.database.redis.db,
            });

            this.connected = true;

            return this.client;
        }
    }
}

module.exports = redis;
