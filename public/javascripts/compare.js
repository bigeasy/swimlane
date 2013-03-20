function compare(actual, expected, name) {
  if (!deepCompare(actual, expected)) {
    $("#comparisons").show();
    $("#comparisons").append("<h3>Failed: " + name + "</h3>");
    $("<pre class='expected'></pre>").text("[" + $(expected).html() + "]").appendTo("#comparisons");
    $("<pre class='actual'></pre>").text("[" + $(actual).html() + "]").appendTo("#comparisons");
    return false;
  }
  return true;
}

function deepCompare(actual, expected) {
  actual.normalize();
  var left = actual.firstChild, right = expected.firstChild,
      lefts = [ actual ], rights = [ expected ];
  if (left == null || right == null) {
    return false;
  }
  COMPARE: for (;;) {
    if (left.nodeType != right.nodeType) {
      return false;
    } else if (left.nodeType == 1) {
      if (left.tagName != right.tagName) {
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
    } else if (right.firstChild) {
      return false;
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
          break;
        } else {
          left = lefts.pop();
          right = rights.pop();
        }
      }
    } 
  }
}
// vim: set ts=2 sw=2 nowrap:
