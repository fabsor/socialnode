$(function() {


  $('#methodtable a').click(linkBind);
  $('input#addmethod').click(function () {
    var method = $('select[name=method]').val();
    $.post('/endpoints/methodform', { plugin: method }, function (data) {
      $('#method-form').html(data);
      $('#addmethodform').submit(methodFormSubmit);
    });
    return false;
  });

  function linkBind() {
    $('#method-form').load($(this).attr('href'));
    return false;
  }

  function methodFormSubmit() {
    var methodPlugin = $('select[name=method]').val();
    var methodName = $('select[name=method] option[value=:method]'.replace(':method', methodPlugin)).html();
    var responsePlugin = $('select[name=response]', this).val();
    $.post('/endpoints/addmethod', $(this).serialize(), function (data) {
          var operations = '<a href="/endpoints/method/edit/:method" class="operation">Edit</a>' +
        '<a href="/endpoints/method/edit/:method" class="operation">Delete</a>';
      $('#methodtable').append('<tr/>');
      $('#methodtable tr:last').append('<td>' + methodName + '</td>').append('<td>' + operations + '</td>')

    })
      .error(function(data) {
        // Handle errors in some convenient way.
      });
    return false;
  }
});


