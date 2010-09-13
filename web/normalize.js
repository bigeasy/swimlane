$(function () {
  module("normalize()");

  function normalized(test) {
    var div = $("#abnormal ." + test)[0].cloneNode(true);
    var wrong = false;
    try {
      Swimlane.copacetic(div);
    } catch (_) {
      wrong = true;
    }
    ok(wrong, "Did not detect an invalid state.");
    Swimlane.normalize(document, div); 
    ok(compare(div, $("#normal ." + test)[0], test), "Not equal to expected value.");;
    Swimlane.copacetic(div);
  }

  test("wraps plain text", function () {
    normalized("unwrapped");
  });
  test("removes empty spans", function () {
    normalized("empty-span");
  });
  test("removes empty spans in unwrapped blocks", function () {
    normalized("top-empty-span");
  });
  test("removes placeholder spans with text", function () {
    normalized("placeholder-span-with-text");
  });
  test("preserved placeholder spans without text", function () {
    normalized("placeholder-span-without-text");
  });
  test("moves spans into paragraphs", function () {
    normalized("moves-span-into-paragraph");
  });
});
// vim: set ts=2 sw=2 nowrap:
