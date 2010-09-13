$(function () {
  module("copacetic()");

  function fail(div, message) {
    var failed = null;
    try {
      Swimlane.copacetic(div);
    } catch (_) {
      failed = _.message;
    }
    ok(failed != null, "Exception not thrown.");
    equals(failed, message, "Unexpected error.");
  }

  test("accepts strong", function () {
    Swimlane.copacetic($("#normal .strong")[0]);
  });
  test("accepts em", function () {
    Swimlane.copacetic($("#normal .em")[0]);
  });
  test("accepts br", function () {
    Swimlane.copacetic($("#normal .br")[0]);
  });
  test("accepts trainling whitespace", function () {
    Swimlane.copacetic($("#normal .trailing-white")[0]);
  });
  test("rejects leading whitespace", function () {
    var div = $("#abnormal .leading-white")[0];
    if ($.browser.msie) {
      div.firstChild.firstChild.data = " " + div.firstChild.firstChild.data;
    }
    fail(div, "Unnormalized whitespace.");
  });
  test("accepts placeholder br", function () {
    Swimlane.copacetic($("#normal .placeholder-br")[0]);
  });
  test("rejects br at start", function () {
    var div = $("#abnormal .br-at-start")[0];
    fail(div, "A block cannot begin with a <br> unless it is a placeholder.");
  });
  test("rejects br placeholder at end", function () {
    var div = $("#abnormal .br-at-end")[0];
    fail(div, "A block cannot end with a placehodler <br>.");
  });
  test("rejects span placeholder with text", function () {
    fail($("#abnormal .placeholder-span-with-text")[0], "Invalid element <span> in paragraph.");
  });
  test("accepts span placeholder without text", function () {
    Swimlane.copacetic($("#normal .placeholder-span-without-text")[0]);
  });
});
// vim: set ts=2 sw=2 nowrap:
