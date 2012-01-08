$(function() {
  $('input#addmethod').click(function () {
    var method = $('#method').val();
    $.post('/endpoints/methodform', { plugin: method }, function (data) {
      $('#method-form').html(data);
    });
    return false;
  });

});


