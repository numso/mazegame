var shared   = require('../models/shared')
  , _animate = shared.animate
  , render   = require('./requires/render')
  , sizes    = require('../config').sizes
  , game     = require('./game')
  ;

function bindHandlers() {
  $('.menu-item').click(shared.playClickSound);
  $('.menu-item').hover(shared.playHoverSound, shared.nop);

  $('.menu-game').click(function () {
    var size = $(this).data('num');
    showGame(size);
  });

  $('.menu-back').click(popState);
};

function showGame(size) {
  _animate(sizes.game.width, sizes.game.height, function () {
    $('.game-area').html(render('game', {size: size}));
    window.history.replaceState('game', '', '/game/' + size);
    game.init(size);
  });
};

function popState() {
  window.history.back();
};

exports.init     = bindHandlers;
exports.showGame = showGame;
