$(function () {
  module("normalize()");

  function compare(actual, expected) {
    if (!deepCompare(actual, expected)) {
      $("#actual").text("[" + $(actual).html() + "]");
      $("#expected").text("[" + $(expected).html() + "]");
      $("#comparison").show();
      return false;
    }
    return true;
  }
  function deepCompare(actual, expected) {
    var left = actual.firstChild, right = expected.firstChild,
        lefts = [ actual ], rights = [ expected ];
    COMPARE: for (;;) {
      if (left.nodeType != right.nodeType) {
        return false;
      } else if (left.nodeType == 1) {
        if (left.localName != right.localName) {
          return false;
        }
      }  else if (left.nodeType == 3) {
        if (left.data != right.data) {
          return false;
        }
      }
      if (left.firstChild) {
        if (!right.firstChild) {
          return false;
        }
        lefts.push(left);
        rights.push(right);
        left = left.firstChild;
        right = right.firstChild;
      } else {
        for (;;) {
          if (left == actual) {
            if (right != expected) {
              return false;
            }
            return true;
          } else if (right == expected) {
            return false;
          } else if (left.nextSibling) {
            if (!right.nextSibling) {
              return false;
            }
            left = left.nextSibling;
            right = right.nextSibling;
          } else {
            left = lefts.pop();
            right = rights.pop();
          }
        }
      } 
    }
  }

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
    Swimlane.copacetic(div);
    ok(compare(div, $("#normal ." + test)[0]), "Not equal to expected value.");;
  }

  test("normalize wraps plain text", function () {
    normalized("unwrapped");
  });
});
// vim: set ts=2 sw=2 nowrap:
