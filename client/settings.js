var shared = require('../models/shared')
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
