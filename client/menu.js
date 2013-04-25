var render        = require('./requires/render')
  , scoresHandles = require('./scores')
  , levels        = require('./levels')
  , settings      = require('./settings')
  , shared        = require('../models/shared')
  , _animate      = shared.animate
  ;

var sizes;

function startMenu(lsizes) {
  sizes = lsizes;
  bindHandlers();
};

function bindHandlers() {
  $('.menu-item').click(shared.playClickSound);
  $('.menu-item').hover(shared.playHoverSound, shared.nop);

  $('.menu-new').click(levelSelect);
  $('.menu-scores').click(showScores);
  $('.menu-credits').click(showCredits);
  $('.menu-settings').click(showSettings);
  $('.menu-exit').click(exit);
  $('.menu-back').click(popState);
};

function showMenu() {
  _animate(sizes.menu.width, sizes.menu.height, function () {
    $('.game-area').html(render('menu'));
    bindHandlers();
  });
};

function levelSelect(e, noChange) {
  _animate(sizes.levels.width, sizes.levels.height, function () {
    $('.game-area').html(render('levels'));
    levels.init();
    if (!noChange)
      window.history.pushState('levels', '', '/levels');
  });
};

function showScores(e, noChange) {
  var hasLoaded   = false
    , hasRendered = false
    , scores
    ;

  $.get('getScores', function (data) {
    scores = data;
    hasLoaded = true;
    if (hasRendered) {
      renderScores();
    }
  });

  _animate(sizes.scores.width, sizes.scores.height, function () {
    hasRendered = true;

    if (hasLoaded) {
      renderScores();
    } else {
      $('.game-area').html(render('scores', { scores: false }));
      bindHandlers();
    }

    if (!noChange)
      window.history.pushState('scores', '', '/scores');
  });

  function renderScores() {
    $('.game-area').html(render('scores', { scores: scores }));
    bindHandlers();
    scoresHandles();
  };
};

function showCredits(e, noChange) {
  _animate(sizes.credits.width, sizes.credits.height, function () {
    $('.game-area').html(render('credits'));
    bindHandlers();
    if (!noChange)
      window.history.pushState('credits', '', '/credits');
  });
};

function showSettings(e, noChange) {
  _animate(sizes.settings.width, sizes.settings.height, function () {
    $('.game-area').html(render('settings', { settings: { music: shared.get('music'), effects: shared.get('effects') } }));
    bindHandlers();
    settings.init();
    if (!noChange)
      window.history.pushState('settings', '', '/settings');
  });
};

function exit() {
  if (confirm("Are you sure you want to quit playing?")) {
    window.open('', '_self', '');
    window.close();
  }
};

function popState() {
  window.history.back();
};

exports.init = startMenu;

exports.showMenu = showMenu
exports.levelSelect = levelSelect
exports.showScores = showScores
exports.showCredits = showCredits
