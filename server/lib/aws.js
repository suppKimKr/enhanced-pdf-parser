const { S3Client } = require('@aws-sdk/client-s3');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

const awsConfig = {
    credentials: {
        accessKeyId: config.aws.accessKey,
        secretAccessKey: config.aws.secretAccessKey,
    },
    region: config.aws.region,
};

module.exports = {
    S3Client: () => new S3Client(awsConfig),
    BedrockClient: () => new BedrockRuntimeClient(awsConfig),
};
