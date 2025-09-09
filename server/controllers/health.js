const express = require('express');
const { wrapRouter } = require('../middleware');

const router = wrapRouter(express.Router());

router.get('/', async (req, res) => {
    res.sendStatus(200);
});

module.exports = router;
