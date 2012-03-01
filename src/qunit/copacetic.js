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

  function accepts(path, title) {
    test(title, function () {
      ok(Swimlane.copacetic($(path)[0]), title);
    });
  }

  function rejects(path, exception, title) {
    test(title, function () {
      var div = $(path)[0];
      fail(div, exception);
    });
  }

  accepts("#normal .strong", "accepts strong");
  accepts("#normal .em", "accepts em");
  accepts("#normal .br", "accepts br");
  accepts("#normal .trailing-white", "accepts trainling whitespace");
  test("rejects leading whitespace", function () {
    var div = $("#abnormal .leading-white")[0];
    if ($.browser.msie) {
      div.firstChild.firstChild.data = " " + div.firstChild.firstChild.data;
    }
    fail(div, "Unnormalized whitespace.");
  });
  accepts("#normal .placeholder-br", "accepts placeholder br");
  rejects("#abnormal .br-at-start",
          "A block cannot begin with a <br> unless it is a placeholder.",
          "rejects br at start");
  rejects("#abnormal .br-at-end",
          "A block cannot end with a placehodler <br>.",
          "rejects br placeholder at end");
  rejects("#abnormal .placeholder-span-with-text",
          "Invalid element <span> in paragraph.",
          "rejects span placeholder with text");
  accepts("#normal .placeholder-span-without-text", "accepts span placeholder without text");
});
// vim: set ts=2 sw=2 nowrap:
