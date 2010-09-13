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
});
// vim: set ts=2 sw=2 nowrap:
