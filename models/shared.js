var store = {};

exports.set            = set;
exports.get            = get;
exports.animate        = animate;
exports.nop            = nop;
exports.playClickSound = playClickSound;
exports.playHoverSound = playHoverSound;

function set(key, val) {
  store[key] = val;
};

function get(key) {
  return store[key];
};

function animate(width, height, cb) {
  var disappearTime = 200
    , widthTime     = 200
    , heightTime    = 200
    ;

  $('.game-area').children().animate({ opacity: 0 },
  { duration: disappearTime, complete: function () {
    $('.game-area').html('');
    $('.game-area').animate({ width: width + "px" },
    { duration: widthTime, complete: function () {
      $('.game-area').animate({ height: height + "px" },
      { duration: heightTime, complete: function () {
        cb();
      }});
    }});
  }});
};

function playClickSound() {
  if (get('effects')) {
    $('#mus-menu-click')[0].currentTime = 0;
    $('#mus-menu-click')[0].play();
  }
};

function playHoverSound() {
  if (get('effects')) {
    $('#mus-menu-hover')[0].currentTime = 0;
    $('#mus-menu-hover')[0].play();
  }
};

function nop() {};
