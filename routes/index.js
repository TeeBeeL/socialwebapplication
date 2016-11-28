var express = require('express');
var router = express.Router();
var ud = require('../usersdata.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: ud.bankusers[1].name, name: 'Teju', usersdata: ud});
});

module.exports = router;
