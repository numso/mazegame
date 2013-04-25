var render   = require('./requires/render')
  , mazecode = require('./maze')
  , shared   = require('../models/shared')
  ;

var myTimer
  , score
  , showPath
  , showHint
  , hiscores
  ;

$.get('/getScores', function (data) {
  hiscores = data;
});

exports.checkOnLoad = checkOnLoad;
exports.init        = init;
exports.destroy     = clearStuff;

function checkOnLoad() {
  var test = $('.gameIsLoading');
  if (test.length) {
    var size = test.data('size');
    test.remove();
    init(size);
  }
};

function init(size) {
  showPath = false;
  showHint = false;
  score    = 0;

  var maze = mazecode.generate(size);
  $('.maze').html(render('maze', { maze: maze }));
  startTimer();
  setupHandlers(maze);
};

function startTimer() {
  var now = Date.now();
  myTimer = setInterval(function () {
    var cur     = Date.now()
      , seconds = Math.floor((cur - now) / 1000)
      , minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    if (seconds < 10) seconds = "0" + seconds;
    $('.hud-time').find('span').text(minutes + ":" + seconds);
  }, 1000);
};

function setupHandlers(maze) {
  $('.game-item').click(shared.playClickSound);
  $('.game-item').hover(shared.playHoverSound, shared.nop);

  $('.toggle-hud').click(toggleHud);
  $('.go-back').click(goBack);
  $('.toggle-crumbs').click(toggleCrumbs);
  $('.toggle-path').click(function () { togglePath(maze); });
  $('.toggle-hint').click(function () { toggleHint(maze) });

  $(document).keydown(function (e) {
    var didMove
      , menuClick = false;

    if (e.keyCode === 66)
      toggleCrumbs();
    if (e.keyCode === 89)
      toggleHud();
    if (e.keyCode === 80)
      togglePath(maze);
    if (e.keyCode === 72)
      toggleHint(maze);

    if (e.keyCode === 66 || e.keyCode === 89 || e.keyCode === 80 || e.keyCode === 72) {
      menuClick = true;
      shared.playClickSound();
    }

    if (e.keyCode === 87 || e.keyCode === 73 || e.keyCode === 38) // up or w or i
      didMove = move(maze, maze.x, maze.y - 1); // move up
    if (e.keyCode === 65 || e.keyCode === 74 || e.keyCode === 37)  // left or a or j
      didMove = move(maze, maze.x - 1, maze.y); // move left
    if (e.keyCode === 83 || e.keyCode === 75 || e.keyCode === 40) // down or s or k
      didMove = move(maze, maze.x, maze.y + 1); // move down
    if (e.keyCode === 68 || e.keyCode === 76 || e.keyCode === 39) // right or d or l
      didMove = move(maze, maze.x + 1, maze.y); // move right

    if (!menuClick) {
      if (didMove) {
        playPlayerSound();
      }
      return false;
    }
  });
};

function playPlayerSound() {
  if (shared.get('effects')) {
    $('#mus-player-move')[0].currentTime = 0;
    $('#mus-player-move')[0].play();
  }
};

function toggleHud() {
  if ($('.hud').hasClass('invisible')) {
    $('.hud').removeClass('invisible');
    $('.toggle-hud').text('Hide Score (y)');
  } else {
    $('.hud').addClass('invisible');
    $('.toggle-hud').text('Show Score (y)');
  }
};

function clearStuff() {
  clearInterval(myTimer);
  $(document).unbind();
};

function goBack() {
  clearStuff();
  window.history.back();
};

function toggleCrumbs() {
  if ($('.maze-board').hasClass('crumbs')) {
    $('.maze-board').removeClass('crumbs');
    $('.toggle-crumbs').text('Show Breadcrumbs (b)');
  } else {
    $('.maze-board').addClass('crumbs');
    $('.toggle-crumbs').text('Hide Breadcrumbs (b)');
  }
};

function togglePath(maze) {
  showPath = !showPath;
  if (showPath) {
    $('.toggle-path').text('Hide Path (p)');

    for (var i = 0; i < maze.solution.length; ++i) {
      $('.maze-block[data-x=' + maze.solution[i].x + '][data-y=' + maze.solution[i].y + ']').addClass('path');
    }
  } else {
    $('.toggle-path').text('Show Path (p)');
    $('.path').removeClass('path');
  }
};

function toggleHint(maze) {
  showHint = !showHint;

  if (showHint) {
    $('.toggle-hint').text('Hide Hint (h)');
  } else {
    $('.toggle-hint').text('Show Hint (h)');
  }

  redrawHint(maze);
};

function move(maze, x, y) {
  var oldx = maze.x
    , oldy = maze.y;

  if (!checkCollisions(maze, x, y)) {

    $('.maze-block[data-x=' + oldy + '][data-y=' + oldx + ']').addClass('visited');

    maze.x = x;
    maze.y = y;
    $('.player').css('left', maze.x * 10 + 'px');
    $('.player').css('top', maze.y * 10 + 'px');

    var test = maze.solution.pop();
    if (!(test.x === y && test.y === x)) {
      if (test.shortest) {
        score -= 1;
      } else {
        score -= 2;
      }
      updateScore();
      maze.solution.push(test);
      maze.solution.push({ x: oldy, y: oldx });
      if (showPath) {
        $('.maze-block[data-x=' + oldy + '][data-y=' + oldx + ']').addClass('path');
      }
    } else {
      if (test.shortest) {
        score += 5;
      } else {
        var test2 = maze.solution.pop();
        maze.solution.push(test2);
        if (test2.shortest) {
          score -= 1;
        } else {
          score -= 2;
        }
      }
      updateScore();

      if (showPath) {
        $('.maze-block[data-x=' + test.x + '][data-y=' + test.y + ']').removeClass('path');
      }
    }

    redrawHint(maze);
    checkForWin(maze);
    return true;
  }
  return false;
};

function updateScore() {
  $('.hud-score').find('span').text(score);
};

function checkCollisions(maze, x, y) {
  return y > maze.board.length - 1 || maze.board[y][x].isWall;
};

function checkForWin(maze) {
  if (maze.x === maze.winx && maze.y === maze.winy) {
    clearStuff();

    if (shared.get('effects')) {
      $('#mus-victory')[0].currentTime = 0;
      $('#mus-victory')[0].play();
    }

    var newHigh = -1;
    if (hiscores[maze.size]) {
      for (var i = 0; newHigh < 0 && i < hiscores[maze.size].length; ++i) {
        if (score > hiscores[maze.size][i].points) {
          newHigh = i;
        }
      }
    }

    if (newHigh >= 0) {
      var newName = prompt('You Got A New High Score!! Enter your Name: ');
      if (newName !== null) {
        $.post('/setScore', { score: { name: newName, score: score, size: maze.size, position: newHigh } });
      }
    } else {
      alert("Good Job! You Solved the Maze!");
    }

    window.history.back();
  }
};

function redrawHint(maze) {
  $('.hint').removeClass('hint');
  if (showHint) {
    var test = maze.solution.pop();
    maze.solution.push(test);
    $('.maze-block[data-x=' + test.x + '][data-y=' + test.y + ']').addClass('hint');
  }
};
