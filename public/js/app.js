(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json",".jade"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("credits.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var credits_mixin = function(){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="credits"><div class="subtitle">Credits</div><div class="credits-box"><div class="info">Created By<span><a target="_blank" href="http://www.dallinosmun.com">Dallin Osmun</a></span></div><div class="info">Inspired By<span>CS 5410</span></div><div class="info">Maze Generation Algorithms By<span><a target="_blank" href="http://en.wikipedia.org/wiki/Maze_generation_algorithm">Wikipedia</a></span></div><div class="info">Color Scheme By<span>Tarah Udy</span></div><div class="info">Music<span><a target="_blank" href="http://incompetech.com/music/royalty-free/?keywords=lemon">Easy Lemon</a></span></div></div><div class="menu-item menu-back">back</div></div>');
};
credits_mixin();
}
return buf.join("");
}
});

require.define("game.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var game_mixin = function(size){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="game"><div class="hud"><span class="hud-score">Score: <span>0</span></span><span class="hud-time">Time: <span>0:00</span></span></div><div class="maze">Creating your ' + escape((interp = size) == null ? '' : interp) + ' x ' + escape((interp = size) == null ? '' : interp) + ' maze. Please Wait.</div><div class="buttons"><div class="top-row"><div class="game-item toggle-crumbs">Show BreadCrumbs (b)</div><div class="game-item toggle-hud">Hide Score (y)</div></div><div><div class="game-item toggle-path">Show Path (p)</div><div class="game-item toggle-hint">Show Hint (h)</div><div class="game-item go-back">Back</div></div></div></div>');
};
game_mixin(size);
}
return buf.join("");
}
});

require.define("levels.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var menu_mixin = function(){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="menu">');
menu_item_mixin.call({
attributes: {"class": ('menu-new')}, escaped: {}
}, "New Game");
menu_item_mixin.call({
attributes: {"class": ('menu-scores')}, escaped: {}
}, "High Scores");
menu_item_mixin.call({
attributes: {"class": ('menu-settings')}, escaped: {}
}, "Settings");
menu_item_mixin.call({
attributes: {"class": ('menu-credits')}, escaped: {}
}, "Credits");
menu_item_mixin.call({
attributes: {"class": ('menu-exit')}, escaped: {}
}, "Exit");
buf.push('</div>');
};
var menu_item_mixin = function(name){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="menu-item-container"><div');
buf.push(attrs(merge({ "class": ('menu-item') }, attributes), merge({}, escaped, true)));
buf.push('>');
var __val__ = name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
};
var levels_mixin = function(){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="level">');
menu_item_mixin.call({
attributes: {'data-num':(5), "class": ('menu-game')}, escaped: {"data-num":true}
}, "5x5 Puzzle");
menu_item_mixin.call({
attributes: {'data-num':(10), "class": ('menu-game')}, escaped: {"data-num":true}
}, "10x10 Puzzle");
menu_item_mixin.call({
attributes: {'data-num':(15), "class": ('menu-game')}, escaped: {"data-num":true}
}, "15x15 Puzzle");
menu_item_mixin.call({
attributes: {'data-num':(20), "class": ('menu-game')}, escaped: {"data-num":true}
}, "20x20 Puzzle");
menu_item_mixin.call({
attributes: {"class": ('menu-back')}, escaped: {}
}, "Back");
buf.push('</div>');
};
levels_mixin();
}
return buf.join("");
}
});

require.define("maze.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div class="header">exit</div><div class="maze-board"><div');
buf.push(attrs({ 'style':('left: ' + maze.x * 10 + 'px; top:' + maze.y * 10 + 'px'), "class": ('player') }, {"style":true}));
buf.push('></div>');
// iterate maze.board
;(function(){
  if ('number' == typeof maze.board.length) {

    for (var i = 0, $$l = maze.board.length; i < $$l; i++) {
      var row = maze.board[i];

buf.push('<div style="clear:both;">');
// iterate row
;(function(){
  if ('number' == typeof row.length) {

    for (var j = 0, $$l = row.length; j < $$l; j++) {
      var cell = row[j];

 var klass = cell.isWall ? 'wall' : ''
buf.push('<div');
buf.push(attrs({ 'data-x':(i), 'data-y':(j), "class": (klass) + ' ' + ('maze-block') }, {"data-x":true,"data-y":true}));
buf.push('><div class="breadcrumb"></div></div>');
    }

  } else {
    var $$l = 0;
    for (var j in row) {
      $$l++;      var cell = row[j];

 var klass = cell.isWall ? 'wall' : ''
buf.push('<div');
buf.push(attrs({ 'data-x':(i), 'data-y':(j), "class": (klass) + ' ' + ('maze-block') }, {"data-x":true,"data-y":true}));
buf.push('><div class="breadcrumb"></div></div>');
    }

  }
}).call(this);

buf.push('</div>');
    }

  } else {
    var $$l = 0;
    for (var i in maze.board) {
      $$l++;      var row = maze.board[i];

buf.push('<div style="clear:both;">');
// iterate row
;(function(){
  if ('number' == typeof row.length) {

    for (var j = 0, $$l = row.length; j < $$l; j++) {
      var cell = row[j];

 var klass = cell.isWall ? 'wall' : ''
buf.push('<div');
buf.push(attrs({ 'data-x':(i), 'data-y':(j), "class": (klass) + ' ' + ('maze-block') }, {"data-x":true,"data-y":true}));
buf.push('><div class="breadcrumb"></div></div>');
    }

  } else {
    var $$l = 0;
    for (var j in row) {
      $$l++;      var cell = row[j];

 var klass = cell.isWall ? 'wall' : ''
buf.push('<div');
buf.push(attrs({ 'data-x':(i), 'data-y':(j), "class": (klass) + ' ' + ('maze-block') }, {"data-x":true,"data-y":true}));
buf.push('><div class="breadcrumb"></div></div>');
    }

  }
}).call(this);

buf.push('</div>');
    }

  }
}).call(this);

buf.push('</div><div class="footer">enter</div>');
}
return buf.join("");
}
});

require.define("menu.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var menu_mixin = function(){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="menu">');
menu_item_mixin.call({
attributes: {"class": ('menu-new')}, escaped: {}
}, "New Game");
menu_item_mixin.call({
attributes: {"class": ('menu-scores')}, escaped: {}
}, "High Scores");
menu_item_mixin.call({
attributes: {"class": ('menu-settings')}, escaped: {}
}, "Settings");
menu_item_mixin.call({
attributes: {"class": ('menu-credits')}, escaped: {}
}, "Credits");
menu_item_mixin.call({
attributes: {"class": ('menu-exit')}, escaped: {}
}, "Exit");
buf.push('</div>');
};
var menu_item_mixin = function(name){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="menu-item-container"><div');
buf.push(attrs(merge({ "class": ('menu-item') }, attributes), merge({}, escaped, true)));
buf.push('>');
var __val__ = name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
};
menu_mixin();
}
return buf.join("");
}
});

require.define("scores.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var scores_mixin = function(scores){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="scores"><div class="subtitle">High Scores</div><div class="score-box">');
if ( scores)
{
buf.push('<div class="tab-titles-container">');
// iterate scores
;(function(){
  if ('number' == typeof scores.length) {

    for (var i = 0, $$l = scores.length; i < $$l; i++) {
      var set = scores[i];

 var klass = (i == 5) ? 'selected' : '';
buf.push('<div');
buf.push(attrs({ 'data-scoresid':(i), "class": ('tab-title') + ' ' + (klass) }, {"class":true,"data-scoresid":true}));
buf.push('>');
var __val__ = i
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
    }

  } else {
    var $$l = 0;
    for (var i in scores) {
      $$l++;      var set = scores[i];

 var klass = (i == 5) ? 'selected' : '';
buf.push('<div');
buf.push(attrs({ 'data-scoresid':(i), "class": ('tab-title') + ' ' + (klass) }, {"class":true,"data-scoresid":true}));
buf.push('>');
var __val__ = i
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div>');
    }

  }
}).call(this);

buf.push('</div><div class="tab-titles-bar"></div>');
// iterate scores
;(function(){
  if ('number' == typeof scores.length) {

    for (var i = 0, $$l = scores.length; i < $$l; i++) {
      var set = scores[i];

 var stile = (i != 5) ? 'display: none' : '';
buf.push('<div');
buf.push(attrs({ 'style':(stile), "class": ('score-set score-set-' + i) }, {"class":true,"style":true}));
buf.push('>');
// iterate set
;(function(){
  if ('number' == typeof set.length) {

    for (var j = 0, $$l = set.length; j < $$l; j++) {
      var score = set[j];

buf.push('<div class="score"><div class="num">');
var __val__ = (j + 1) + ". "
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="name">');
var __val__ = score.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="points">');
var __val__ = score.points
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
    }

  } else {
    var $$l = 0;
    for (var j in set) {
      $$l++;      var score = set[j];

buf.push('<div class="score"><div class="num">');
var __val__ = (j + 1) + ". "
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="name">');
var __val__ = score.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="points">');
var __val__ = score.points
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
    }

  }
}).call(this);

buf.push('</div>');
    }

  } else {
    var $$l = 0;
    for (var i in scores) {
      $$l++;      var set = scores[i];

 var stile = (i != 5) ? 'display: none' : '';
buf.push('<div');
buf.push(attrs({ 'style':(stile), "class": ('score-set score-set-' + i) }, {"class":true,"style":true}));
buf.push('>');
// iterate set
;(function(){
  if ('number' == typeof set.length) {

    for (var j = 0, $$l = set.length; j < $$l; j++) {
      var score = set[j];

buf.push('<div class="score"><div class="num">');
var __val__ = (j + 1) + ". "
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="name">');
var __val__ = score.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="points">');
var __val__ = score.points
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
    }

  } else {
    var $$l = 0;
    for (var j in set) {
      $$l++;      var score = set[j];

buf.push('<div class="score"><div class="num">');
var __val__ = (j + 1) + ". "
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="name">');
var __val__ = score.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div><div class="points">');
var __val__ = score.points
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
    }

  }
}).call(this);

buf.push('</div>');
    }

  }
}).call(this);

}
else
{
buf.push('<p>LOADING...</p>');
}
buf.push('</div><div class="menu-item menu-back">back</div></div>');
};
scores_mixin(scores);
}
return buf.join("");
}
});

require.define("settings.jade",function(require,module,exports,__dirname,__filename,process,global){module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
var settings_mixin = function(settings){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="settings">');
settings_item_mixin.call({
attributes: {"class": ('settings-music')}, escaped: {}
}, "Background Music", settings.music);
settings_item_mixin.call({
attributes: {"class": ('settings-effects')}, escaped: {}
}, "Sound Effects", settings.effects);
menu_item_mixin.call({
attributes: {"class": ('menu-back')}, escaped: {}
}, "Back");
buf.push('</div>');
};
var settings_item_mixin = function(name, val){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
 val = '' + val;
buf.push('<div class="settings-item-container"><div');
buf.push(attrs(merge({ "class": ('settings-item') }, attributes), merge({}, escaped, true)));
buf.push('>');
var __val__ = name + ": "
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('<span>');
var __val__ = (val == 'true' ? "ON" : "OFF")
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</span></div></div>');
};
var menu_item_mixin = function(name){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push('<div class="menu-item-container"><div');
buf.push(attrs(merge({ "class": ('menu-item') }, attributes), merge({}, escaped, true)));
buf.push('>');
var __val__ = name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</div></div>');
};
settings_mixin(settings);
}
return buf.join("");
}
});

require.define("/client/requires/render.js",function(require,module,exports,__dirname,__filename,process,global){var render = require('browserijade');

module.exports = function (view, locals) {
  return render(view, locals);
};

});

require.define("/node_modules/browserijade/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./lib/middleware","browserify":"./lib/browserijade"}
});

require.define("/node_modules/browserijade/lib/browserijade.js",function(require,module,exports,__dirname,__filename,process,global){// Browserijade
// (c) 2011 David Ed Mellum
// Browserijade may be freely distributed under the MIT license.

jade = require('jade/lib/runtime');

// Render a jade file from an included folder in the Browserify
// bundle by a path local to the included templates folder.
var renderFile = function(path, locals) {
	locals = locals || {};
	path = path + '.jade';
	template = require(path);
	return template(locals);
}

// Render a pre-compiled Jade template in a self-executing closure.
var renderString = function(template) {
	return eval(template);
}

module.exports = renderFile;
module.exports.renderString = renderString;
});

require.define("/node_modules/browserijade/node_modules/jade/lib/runtime.js",function(require,module,exports,__dirname,__filename,process,global){
/*!
 * Jade - runtime
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Lame Array.isArray() polyfill for now.
 */

if (!Array.isArray) {
  Array.isArray = function(arr){
    return '[object Array]' == Object.prototype.toString.call(arr);
  };
}

/**
 * Lame Object.keys() polyfill for now.
 */

if (!Object.keys) {
  Object.keys = function(obj){
    var arr = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  }
}

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    ac = ac.filter(nulls);
    bc = bc.filter(nulls);
    a['class'] = ac.concat(bc).join(' ');
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function nulls(val) {
  return val != null;
}

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 * @api private
 */

exports.attrs = function attrs(obj, escaped){
  var buf = []
    , terse = obj.terse;

  delete obj.terse;
  var keys = Object.keys(obj)
    , len = keys.length;

  if (len) {
    buf.push('');
    for (var i = 0; i < len; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('boolean' == typeof val || null == val) {
        if (val) {
          terse
            ? buf.push(key)
            : buf.push(key + '="' + key + '"');
        }
      } else if (0 == key.indexOf('data') && 'string' != typeof val) {
        buf.push(key + "='" + JSON.stringify(val) + "'");
      } else if ('class' == key && Array.isArray(val)) {
        buf.push(key + '="' + exports.escape(val.join(' ')) + '"');
      } else if (escaped && escaped[key]) {
        buf.push(key + '="' + exports.escape(val) + '"');
      } else {
        buf.push(key + '="' + val + '"');
      }
    }
  }

  return buf.join(' ');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  return String(html)
    .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno){
  if (!filename) throw err;

  var context = 3
    , str = require('fs').readFileSync(filename, 'utf8')
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

});

require.define("fs",function(require,module,exports,__dirname,__filename,process,global){// nothing to see here... no file methods for the browser

});

require.define("/config/index.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = {
  browserify: {
    entry: "./client/main.js",
    requires: "./client/requires",
    output: "./public/js/app.js",
    jade: "./views/public"
  },

  styl: {
    path: "./public/styl/",
    entry: "main.styl",
    output: "./public/css/main.css"
  },

  sizes: {
    menu: { width: 300, height: 355 },
    levels: { width: 350, height: 350 },
    scores: { width: 300, height: 475 },
    credits: { width: 500, height: 330 },
    settings: { width: 350, height: 240 },
    game: { width: 500, height: 620 }
  }
};

});

require.define("/client/menu.js",function(require,module,exports,__dirname,__filename,process,global){var render        = require('./requires/render')
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

});

require.define("/client/scores.js",function(require,module,exports,__dirname,__filename,process,global){function bindHandlers() {
  $('.tab-title').click(function () {
    $('.selected').removeClass('selected');
    $(this).addClass('selected');
    $('.score-set').hide();
    $('.score-set-' + $(this).data('scoresid')).show();
  });
};

module.exports = bindHandlers;

});

require.define("/client/levels.js",function(require,module,exports,__dirname,__filename,process,global){var shared   = require('../models/shared')
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

});

require.define("/models/shared.js",function(require,module,exports,__dirname,__filename,process,global){var store = {};

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

});

require.define("/client/game.js",function(require,module,exports,__dirname,__filename,process,global){var render   = require('./requires/render')
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

});

require.define("/client/maze.js",function(require,module,exports,__dirname,__filename,process,global){exports.generate = generate;

function generate(width, height) {
  var maze = _generateMaze(width, height);
  maze.solution = _generateSolution(maze);
  return maze;
};

function _generateMaze(width, height) {
  width = width || 20;
  height = height || width;

  var orig = width;

  width = width * 2 + 1;
  height = height * 2 + 1;

  var maze = _createBase(width, height);
  _breakWalls(maze, width - 2, 1);

  maze[width - 1][1].isWall  = false;  // create entrance
  maze[0][height - 2].isWall = false; // create exit

  return {
    board: maze,
    size: orig,
    x: 1,
    y: width - 1,
    winx: height - 2,
    winy: 0
  };
};

function _createBase(width, height) {
  var maze = [];
  for (var i = 0; i < width; ++i) {
    var temp = [];
    for (var j = 0; j < height; ++j) {
      temp.push({
        inMaze: false,            // for prepping the maze
        inSolution: false,        // for prepping the solution
        isWall: !(i % 2 && j % 2)
      });
    }
    maze.push(temp);
  }

  return maze;
};

function _breakWalls(maze, x, y) {
  var wallList = [];
  _addWalls(wallList, maze, x, y)

  while (wallList.length) {
    var rand = Math.floor(Math.random() * (wallList.length - 1));
    var cell = wallList[rand];
    wallList.splice(rand, 1);

    if (!maze[cell.x + cell.dx][cell.y + cell.dy].inMaze) {
      maze[cell.x][cell.y].isWall = false;
      _addWalls(wallList, maze, cell.x + cell.dx, cell.y + cell.dy);
    }

  };
};

function _addWalls(wallList, maze, x, y) {
  maze[x][y].inMaze = true;

  var tests = [
    { cond: x > 1, x: x - 1, y: y, dx: -1, dy: 0 },
    { cond: y > 1, x: x, y: y - 1, dx: 0, dy: -1 },
    { cond: x < maze.length - 2, x: x + 1, y: y, dx: 1, dy: 0 },
    { cond: y < maze[0].length - 2, x: x, y: y + 1, dx: 0, dy: 1 }
  ];

  for (var i = 0; i < tests.length; ++i) {
    var test = tests[i]
    if (test.cond && !maze[test.x][test.y].inMaze) {
      maze[test.x][test.y].inMaze = true;
      wallList.push({ x: test.x, y: test.y, dx: test.dx, dy: test.dy });
    }
  }
};

function _generateSolution(maze) {
  var results = _searchChildren(maze, maze.y, maze.x);
  results.pop();
  return results;
};

function _searchChildren(maze, x, y) {
  maze.board[x][y].inSolution = true;

  if (x === maze.winy && y === maze.winx) {
    return [{x: x, y: y, shortest: true }];
  }

  var children = _getChildren(maze.board, x, y);
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    var result = _searchChildren(maze, child.x, child.y);
    if (result) {
      result.push({ x: x, y: y, shortest: true });
      return result;
    }
  }

  return false;
};

function _getChildren(maze, x, y) {
  var myArray = [];

  var tests = [
    { cond: x > 0, x: x - 1, y: y },
    { cond: y > 0, x: x, y: y - 1 },
    { cond: x < maze.length - 1, x: x + 1, y: y },
    { cond: y < maze[0].length - 1, x: x, y: y + 1 }
  ];

  for (var i = 0; i < tests.length; ++i) {
    var test = tests[i];
    if (test.cond && !maze[test.x][test.y].isWall && !maze[test.x][test.y].inSolution) {
      maze[test.x][test.y].inSolution = true;
      myArray.push({ x: test.x, y: test.y });
    }
  }

  return myArray;
};

});

require.define("/client/settings.js",function(require,module,exports,__dirname,__filename,process,global){var shared = require('../models/shared')
  ;

function bindHandlers() {
  $('.settings-item').click(settingsClick);
  $('.settings-item').hover(settingsHover, shared.nop);
};

exports.init = bindHandlers;


function settingsHover() {
  if (shared.get('effects')) {
    $('#mus-menu-hover')[0].play();
  }
};

function settingsClick() {
  if (shared.get('effects')) {
    $('#mus-menu-click')[0].play();
  }

  var val = $(this).find('span').text() === "OFF";
  $(this).find('span').text(val ? "ON" : "OFF");
  var settings = {
    music: shared.get('music'),
    effects: shared.get('effects')
  };

  if ($(this).hasClass('settings-music')) {
    settings.music = val;
    shared.set('music', val);

    if (val) {
      $('#mus-background')[0].play();
    } else {
      $('#mus-background')[0].pause();
    }
  } else {
    settings.effects = val;
    shared.set('effects', val);
  }

  $.post('/setSettings', { settings: settings });

};

});

require.define("/client/main.js",function(require,module,exports,__dirname,__filename,process,global){window.require = require;

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

});
require("/client/main.js");
})();
