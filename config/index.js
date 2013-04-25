module.exports = {
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
