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
  test("rejects a br without a preceeding newline", function () {
    fail($("#abnormal .br-no-newline")[0], "There is always a newline before a <br>.");
  });
  test("rejects leading whitespace", function () {
    fail($("#normal .leading-white")[0], "Unnormalized whitespace.");
  });
  test("rejects trailing whitespace", function () {
    fail($("#normal .trailing-white")[0], "Unnormalized whitespace.");
  });
  test("rejects nested blocks", function () {
    fail($("#normal .nested-block")[0], "Unnormalized whitespace.");
  });
});
// vim: set ts=2 sw=2 nowrap:
