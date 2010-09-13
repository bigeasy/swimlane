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
    ok(compare(div, $("#normal ." + test)[0]), "Not equal to expected value.");;
    Swimlane.copacetic(div);
  }

  test("normalize wraps plain text", function () {
    normalized("unwrapped");
  });
  test("normalize removes empty spans", function () {
    normalized("empty-span");
  });
  test("normalize removes empty spans in unwrapped blocks", function () {
    normalized("top-empty-span");
  });
});
// vim: set ts=2 sw=2 nowrap:
