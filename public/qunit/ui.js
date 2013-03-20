$(function () {
  module("ui()");

  $.fn.extend({
    type: function(options) {
      return this.each(function() {
        console.log(options);
        $(this).simulate("keydown", options || {});
        if (options.keyCode != 13 || $.browser.mozilla) {
          $(this).simulate("keypress", options || {});
        }
        $(this).simulate("keyup", options || {});
      });
    },
  });

  function ascii (characters) {
    for (var i = 0; i < characters.length; i++) {
      var ch = characters.substring(i, i + 1);
      var focus =  $(getFocusNode());
      if ($.browser.msie) {
        focus.type({ keyCode: ch.charCodeAt(0) });
      } else if (ch.toLowerCase() != ch) {
        focus.type({ keyCode: ch.charCodeAt(0) - 32, charCode: ch.charCodeAt(0) });
      } else {
        focus.type({ keyCode: ch.charCodeAt(0), charCode: ch.charCodeAt(0) });
      }
    }
  }

  function getFocusNode() {
    if ($.browser.msie)
      return document.selection.createRange().parentElement();
    return window.getSelection().focusNode;
  }

  function setup(input) {
    var selector = "#input ." + input;
    $(selector).wrap("<div class='visible-editor'></div>");
    return new Swimlane(selector);
  }

  function teardown (swimlane) {
    swimlane.unbind();
    $(".visible-editor").remove();
  }

  function typeAndSee(name, chars, leave) {
    var swimlane = setup(name);
    try {
      swimlane.toggle();
      ascii(chars);
      ok(compare($(swimlane.selector)[0],  $("#output ." + name)[0], name), "Not equal to expected value.");;
    } finally {
      if (!leave) teardown(swimlane);
    }
  }

  function backspace () {
    if ($.browser.msie) {
      var range = document.selection.createRange();
      range.move("character", -1);
      range.select();
    } else {
      var selection = window.getSelection();
      selection.collapse(selection.focusNode, selection.focusOffset - 1);
    }
  }

  test("create swimlane", function () {
    var swimlane = setup("create-swimlane");
    teardown(swimlane);
    equals(0, $("#input .create-swimlane").size(), "Swimlane not removed.");
  });

  test("start with para", function () {
    typeAndSee("start-with-para", "a");
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

  test("two paragraphs", function () {
    typeAndSee("two-paragraphs", "a\u000db");
  });

  test("insert single character", function () {
    var name = "insert-single-character";
    var swimlane = setup(name);
    try {
      swimlane.toggle();
      ascii("ab");
      backspace();
      ascii("c");
      ok(compare($(swimlane.selector)[0],  $("#output ." + name)[0], name), "Not equal to expected value.");;
    } finally {
      teardown(swimlane);
    }
  });

  test("break block", function () {
    var name = "break-block";
    var swimlane = setup(name);
    try {
      swimlane.toggle();
      ascii("abc");
      backspace();
      ascii("\u000d");
      ok(compare($(swimlane.selector)[0],  $("#output ." + name)[0], name), "Not equal to expected value.");;
    } finally {
      teardown(swimlane);
    }
  });

  test("single space", function () {
    typeAndSee("single-space", "a b");
  });

});
// vim: set ts=2 sw=2 nowrap:
