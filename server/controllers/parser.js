const express = require('express');
const inspector = require('schema-inspector');
const { wrapRouter, uploadHandler } = require('../middleware');
const uploadDoc = uploadHandler('pdf');
const {requestCombined, validAny, mapper} = require("../lib");
const Format = require('response-format');
const { parserClass} = require('../services');

const router = wrapRouter(express.Router());
const services = new parserClass();

router.post('/parse', [validAny, requestCombined, uploadDoc.single('file')], async (req, res) => {
    inspector.sanitize(mapper.request.parserMapper.CreateDto, req.combined).data;

    if (!req.file) {
        res.status(400).json(Format.badRequest('file is required'));
        return;
    }

    const { documentType } = req.combined;

    const result = await services.parse(req.file, documentType);

    res.json(result);
});

module.exports = router;