$(function () {
  module("ui()");

  $.fn.extend({
    type: function(options) {
      return this.each(function() {
        $(this).simulate("keydown", options || {});
        $(this).simulate("keypress", options || {});
        $(this).simulate("keyup", options || {});
      });
    }
  });

  function getFocusNode() {
    if ($.browser.msie)
      return document.selection.createRange().parentElement();
    return window.getSelection().focusNode;
  }

  function setup(input) {
    var selector = "#input ." + input;
    $(selector).wrap("<div class='visible-editor'></div>");
    return new Swimlane({ selector: selector });
  }

  function teardown (swimlane) {
    swimlane.unbind();
    $(".visible-editor").remove();
  }

  test("create swimlane", function () {
    var swimlane = setup("create-swimlane");
    teardown(swimlane);
    equals(0, $("#input .create-swimlane").size(), "Swimlane not removed.");
  });

  test("type single character", function () {
    var swimlane = setup("single-character");
    try {
      swimlane.toggle();
      $(getFocusNode()).type({ keyCode: 65, charCode: 97 });
      ok(compare($(swimlane.selector)[0],  $("#output .single-character")[0], "single-character"), "Not equal to expected value.");;
    } finally {
      teardown(swimlane);
    }
  });
});
// vim: set ts=2 sw=2 nowrap:
