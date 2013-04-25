function bindHandlers() {
  $('.tab-title').click(function () {
    $('.selected').removeClass('selected');
    $(this).addClass('selected');
    $('.score-set').hide();
    $('.score-set-' + $(this).data('scoresid')).show();
  });
};

module.exports = bindHandlers;
