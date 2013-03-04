$(function ($) {
  $('#edit').click(function () {
    new Swimlane($('#editable')[0]).toggle();
    return false;
  });
});
