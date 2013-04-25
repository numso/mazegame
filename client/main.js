window.require = require;

var sizes    = require('../config').sizes
  , menu     = require('./menu')
  , scores   = require('./scores')
  , levels   = require('./levels')
  , game     = require('./game')
  , settings = require('./settings')
  , shared   = require('../models/shared')
  ;

shared.set('music', $('.music').text() === 'true');
shared.set('effects', $('.effects').text() === 'true');
$('.music').remove();
$('.effects').remove();

if (shared.get('music')) {
  $('#mus-background')[0].play();
}

window.onpopstate = function () {
  if (window.pageLoading) {
    window.pageLoading = false;
    return;
  }

  var state = window.history.state;

  game.destroy();

  if (state === 'menu')
    menu.showMenu();
  if (state === 'levels')
    menu.levelSelect(null, true);
  if (state === 'scores')
    menu.showScores(null, true);
  if (state === 'settings')
    menu.showSettings(null, true);
  if (state === 'credits')
    menu.showCredits(null, true);
  if (state === 'game')
    levels.showGame(5);
};

menu.init(sizes);
scores();
settings.init();
levels.init();
game.checkOnLoad();
