
exports.init = function (app) {
  app.post('/setSettings',
    setSettings
  );
};

function setSettings(req, res, next) {
  req.session.settings = req.body.settings;
  res.send('ok');
};
