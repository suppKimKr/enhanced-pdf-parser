const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4, v5: uuid } = require('uuid');
// const sharp = require('sharp');
const _ = require('lodash');
const Aigle = require('aigle');

const client = new S3Client({
    credentials: {
        accessKeyId: config.aws.accessKey,
        secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
});

module.exports = {
    S3: {
        uploadFile: async function (path, fileObjs, type = 'array') {
            try {
                Aigle.mixin(_);

                const _files_ = [];

                await Aigle.forEach(fileObjs, async function (_file, _index) {
                    // SECTION 파일 업로드
                    // SECTION 원본

                    const key = `${path}/${uuid(_index.toString(), uuidv4())}`;
                    let mimeType = _.split(_file.mimetype, '/')[1];

                    const originParams = {
                        Bucket: config.aws.s3Image,
                        Key: `${key}.${mimeType}`,
                        Body: _file.buffer,
                        ContentType: _file.mimetype,
                    };

                    await client.send(new PutObjectCommand(originParams));
                    // !SECTION

                    const withSort = _.assign(originParams, { ..._file, index: _index });

                    _files_.push(withSort);
                });

                let _return_;

                switch (type) {
                    case 'array':
                        _return_ = _.chain(_files_).orderBy(['index'], ['asc']).map('Key').value()
                        break;
                    case 'object':
                        _return_ = _.chain(_files_).orderBy(['index'], ['asc']).keyBy('fieldname').value();
                        break;
                }

                return _return_;
            } catch (error) {
                console.error(`[aws] ${error.message}`);
            }
        },
        getFile: async function (_bucket, _key) {
            try {
                const getObjectCommand = new GetObjectCommand({
                    Bucket: _bucket,
                    Key: _key,
                });

                const response = await client.send(getObjectCommand)

                const output = await response.Body.transformToString();

                return JSON.parse(output);
            } catch (error) {
                console.error(`[aws] ${error.message}`);
            }
        }
    }
};
