exports.generate = generate;

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
