var fs    = require('fs')
  , sizes = require('../config').sizes
  ;

exports.init = function (app) {
  app.get('/',
    index,
    app.middleware.render('index/index')
  );

  app.get('/game',
    game
  );

  app.get('/levels',
    levels,
    app.middleware.render('index/index')
  );

  app.get('/scores',
    scores,
    app.middleware.render('index/index')
  );

  app.get('/settings',
    settings,
    app.middleware.render('index/index')
  );

  app.get('/credits',
    credits,
    app.middleware.render('index/index')
  );

  app.get('/game/:size',
    gameSize,
    app.middleware.render('index/index')
  );

  app.get('/getScores',
    getScores
  );

  app.post('/setScore',
    setScore
  );
};

function gameSize(req, res, next) {
  res.locals({ state: 'game', size: req.params.size, width: sizes.game.width, height: sizes.game.height });
  next();
};

function index(req, res, next) {
  res.locals({ state: 'menu', width: sizes.menu.width, height: sizes.menu.height });
  next();
};

function game(req, res, next) {
  res.redirect('/levels');
};

function levels(req, res, next) {
  res.locals({ state: 'levels', width: sizes.levels.width, height: sizes.levels.height });
  next();
};

function settings(req, res, next) {
  res.locals({ state: 'settings', width: sizes.settings.width, height: sizes.settings.height });
  next();
};

function scores(req, res, next) {
  res.locals({ state: 'scores', scores: _getScores(), width: sizes.scores.width, height: sizes.scores.height });
  next();
};

function credits(req, res, next) {
  res.locals({ state: 'credits', width: sizes.credits.width, height: sizes.credits.height });
  next();
};


function getScores(req, res, next) {
  var scores = _getScores();
  res.send(scores);
};

function _getScores() {
  var scores = JSON.parse(fs.readFileSync('models/scores.json'));
  return scores;
};

function setScore(req, res, next) {
  var scoresObj = req.body.score;

  var scores = JSON.parse(fs.readFileSync('models/scores.json'));
  scores[scoresObj.size].splice(scoresObj.position, 0, { name: scoresObj.name, points: parseInt(scoresObj.score, 10) });
  scores[scoresObj.size].length = 10;
  fs.writeFileSync('models/scores.json', JSON.stringify(scores));

  res.send('ok');
};
