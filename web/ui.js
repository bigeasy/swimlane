$(function () {
  module("ui()");

  $.fn.extend({
    type: function(options) {
      return this.each(function() {
        $(this).simulate("keydown", options || {});
        $(this).simulate("keypress", options || {});
        $(this).simulate("keyup", options || {});
      });
    },
    ascii: function(characters) {
      return this.each(function() {
        for (var i = 0; i < characters.length; i++) {
          var ch = characters.substring(i, i + 1);
          if ($.browser.msie) {
            $(this).type({ keyCode: ch.charCodeAt(0) });
          } else if (ch.toLowerCase() != ch) {
            $(this).type({ keyCode: ch.charCodeAt(0) - 32, charCode: ch.charCodeAt(0) });
          } else {
            $(this).type({ keyCode: ch.charCodeAt(0), charCode: ch.charCodeAt(0) });
          }
        }
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

  function  typeAndSee(name, chars, leave) {
    var swimlane = setup(name);
    try {
      swimlane.toggle();
      $(getFocusNode()).ascii(chars);
      ok(compare($(swimlane.selector)[0],  $("#output ." + name)[0], name), "Not equal to expected value.");;
    } finally {
      teardown(swimlane);
    }
  }


  test("two paragraphs", function () {
    typeAndSee("two-paragraphs", "a\u000db", true);
  });
  test("type single character", function () {
    typeAndSee("single-character", "a");
  });

  test("type two characters", function () {
    typeAndSee("two-characters", "ab");
  });

  test("type many characters", function () {
    typeAndSee("many-characters", "abc");
  });

  test("leave a space at the end", function () {
    typeAndSee("space-at-end", "a ");
  });
});
// vim: set ts=2 sw=2 nowrap:
