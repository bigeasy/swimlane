// swimlane.js
//
// Management and cross-browserization of HTML5 content editable controls.
//
(function () {
  var console = window.console || { log: function () {} };
  var Swimlane = window.Swimlane = function (options) {
    $.extend(this, options);
  }

  var disabledValue;
  $.extend(Swimlane.prototype, {
    toggle: function () {
      var swimlane = this;
      var rebind = {};
      $.each("keyup keydown keypress paste".split(/\s+/), function (index, value) {
        rebind[value] = function (e) { return swimlane[value](e); };
      });
      var value = $(this.selector).attr("contentEditable");
      if (value == "false" || value == "inherit") {
        $.each(rebind, function (key, value) { $(swimlane.selector).bind(key, value); });
        disabledValue = value;
        var editable = $(this.selector)[0];
        Swimlane.normalize(document, editable);
        editable.setAttribute("contentEditable", "true");
        if (!editable.firstChild || characterCount(editable.firstChild) == 0) {
          if ($.browser.msie) {
            $(editable).append("<p><span class='__swimlane__placeholder'></span></p>");
          } else {
            $(editable).append("<p><br class='__swimlane__placeholder'></p>");
          }
        }
        var node = editable;
        while (node.firstChild && node.firstChild.nodeType != 3 && node.firstChild.tagName != "BR") {
          node = node.firstChild; 
        }
        if (!node.firstChild || node.firstChild != 3) {
          var text = node.insertBefore(document.createTextNode(""), node.firstChild);
          if (!$.browser.msie) {
            node = text;
          }
        }
        if (!$.browser.msie && node.firstChild) {
          node = node.firstChild;
        }
        Cursor.set({ node: node, offset: 0 });
      } else {
        $.each(rebind, function (key, value) { $(swimlane.selector).unbind(key, value); });
        $(this.selector)[0].setAttribute("contentEditable", disabledValue);
      }
    },
    unbind: function () {
      if (this.editing()) this.toggle();
    },
    command: function (name) {
      var editable = $(this.selector)[0];
      var anchorNode = window.getSelection().anchorNode;
      while (anchorNode != null) {
        if (anchorNode == editable) {
          document.execCommand(name, false, null);
          break;
        }
        anchorNode = anchorNode.parentNode;
      }
    },
    editing: function () {
      return $(this.selector).attr("contentEditable") == "true";
    },
    normalize: function() {
      normalize(document, $(this.selector)[0]);
    },
    keydown: function (e) {
      console.log("DOWN: " + e.keyCode + ", " + e.charCode + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      if (e.keyCode == 13) {
        e.preventDefault();
        if (!$.browser.mozilla) this.keypress(e);
      }
    },
    paste: function (e) {
    },
    keypress: function (e) {
      console.log("PRESS: " + e.keyCode + ", " + e.charCode + ", " + e.which + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      var charCode = $.browser.msie ? e.keyCode : e.charCode;

      if (charCode >= 0x20 && !(charCode >= 0x7f && charCode < 0xA0) && charCode != 0xAD && !e.metaKey && !e.ctrlKey) {
      // Printable characters.
        e.preventDefault();
        Cursor.insertText(String.fromCharCode(e.charCode || e.keyCode));
      } else if (e.keyCode == 13) {
      // Enter.
        e.preventDefault();
        var cursor = Cursor.get(); 
        var node = document.createElement(cursor.block.tagName);
        if (cursor.offset == characterCount(cursor.node)) {
          if ($.browser.msie) {
            var selected = $("<span class='__swimlane__placeholder'></span>").appendTo(node);
            $(node).insertAfter(cursor.block);
            Cursor.set({ node: selected[0], offset: 0 });
          } else {
            node.appendChild(document.createTextNode(""));
            var selected = $("<br class='__swimlane__placeholder'>").appendTo(node);
            $(node).insertAfter(cursor.block);
            Cursor.set({ node: node, offset: 0 });
          }
        } else if (containers[cursor.block.tagName]) {
        // A not too difficult split of a top level block.
          Cursor.enter(cursor);
        }
      }
    },
    keyup: function (e) {
      console.log("UP: " + e.keyCode + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      if (e.keyCode == 13) {
        e.preventDefault();
      }
      if ($.browser.msie || e.keyCode != 13) {
        var editable = $(this.selector)[0];
        try {
          Swimlane.copacetic(editable);
        } catch (_) {
          Cursor.set(Swimlane.normalize(document, editable));
        }
      }
    }
  });

  function w3cCursor(factory) {
    function collapse() {
    }
    function textNodeZoom(cursor) {
      if (cursor.node.nodeType == 1) {
        cursor.node = cursor.node.insertBefore(document.createTextNode(""), cursor.node.firstChild);
        cursor.offset = 0;
      }
    }
    return {
      get: function () { 
        var selection = window.getSelection();
        var node = selection.focusNode;
        return {
          node: node,
          offset: selection.focusOffset,
          selection: selection,
          block: node ? node.parentNode : null
        };
      },
      set: function (cursor) {
        window.getSelection().collapse(cursor.node, cursor.offset);
      },
      enter: function (cursor) {
        if (cursor.offset == characterCount(cursor.node)) {
        } else if (containers[cursor.block.tagName]) {
          var split = factory.createElement(cursor.block.tagName);
          var next = cursor.node.splitText(cursor.offset);
          cursor.node = next;
          cursor.offset = 0;
          do {
            var insert = next;
            next = next.nextSibling;
            split.appendChild(insert);
          } while (next);
          $(split).insertAfter(cursor.block);
        }
        Cursor.set(cursor);
      },
      insertText: function (text) {
        var cursor = Cursor.get();
        if (!cursor.selection.isCollapsed)  collapse();
        textNodeZoom(cursor);
        if (cursor.node.data.length == 0 && cursor.node.previousSibling && $(cursor.node.previousSibling).hasClass("__swimlane__placeholder")) {
          $(cursor.node.previousSibling).remove();
        }
        if (cursor.node.data.length != cursor.offset) {
          cursor.node.splitText(cursor.offset);
        }
        cursor.node.data += text;
        cursor.offset++;
        Cursor.set(cursor);
      }
    }
  }
  
  var Cursor = {};
  if ($.browser.webkit || $.browser.mozilla) {
    $.extend(Cursor, w3cCursor(document));
  } else if ($.browser.msie) {
    (function () {
      var count = 0;
      $.extend(Cursor, {
        get: function () {
          count++;
          var selection = document.selection;
          var range = selection.createRange();
          var node = range.parentElement();
          range.pasteHTML("<span id='__swimlane__" +  count + "'></span>");
          var iterator = $("#__swimlane__" + count).get(0);
          var offset = 0;
          for (;;) {
            var iterator = iterator.previousSibling;
            if (!iterator || !(iterator.nodeType == 3 || iterator.nodeType == 4)) {
              break;
            }
            offset += iterator.data.length;
          }
          return {
            node: range.parentElement(),
            offset: offset,
            selection: selection,
            range: range,
            block: range.parentElement()
          }
        },
        insertText: function (text) {
          var range = document.selection.createRange();
          var rect  = range.getBoundingClientRect();
          range.text = text;
        },
        set: function (cursor) {
          var range = document.body.createTextRange();
          if (cursor.offset == 0) {
            document.body.focus();
            var offset = $(cursor.node).offset();
            //range.moveToPoint(offset.left, offset.top);
            range.moveToElementText(cursor.node);
            range.move("character", cursor.offset + 1);
            range.move("character", cursor.offset - 1);
            range.collapse();
            //range.move("character", cursor.offset);
          } else {
            range.moveToElementText(cursor.node);
            range.collapse();
            range.move("character", cursor.offset);
          }
          range.select();
        }
      });
    })();
  } 

  function isTextAbnormal(data) {
    return /[ \n\r\t][ \r\n\t]+/.test(data) || /^[ \n\r\t]/.test(data);
  }

  function normalizeText(data, trailing) {
    var data =  data.replace(/[ \n\r\t][ \r\n\t]+/g, " ").replace(/^[ \n\r\t]+/, "")
    return trailing ? data.replace(/[ \n\r\t]+$/, "") : data;
  }

  // Becoming important to get this right. Probably worth unit testing.
  function characterCount(node) {
    if (node.nodeType == 3) return node.data.length;
    var stack = [ node ], iterator = node.firstChild;
    var count = 0;
    if (iterator) {
      for (;;) {
        if (iterator.nodeType == 3) {
          count += normalizeText(iterator.data, true).length;
        }
        if (iterator.firstChild) {
          stack.push(iterator);
          iterator = iterator.firstChild;
        } else {
          for (;;) {
            if (node == iterator) {
              return count;
            }
            if (iterator.nextSibling) {
              iterator = iterator.nextSibling;
            } else {
              iterator = stack.pop();
            }
          }
        }
      }
    }
    return count;
  }

  var containers = {};
  $.each("LI P".split(/\s+/), function () { containers[this] = true; });
  var inlines =  /^span|sub|strong|em|br$/i,
      blocks = /^ul|ol|p$/i,
      content =  /\S|^\n$/;
  function copacetic (body) {
    var iter = body.firstChild;
    while (iter != null) {
      if (iter.nodeType == 3) {
        if (iter.data != "\n")
          throw "Text content not allowed in body";
      } else if (iter.nodeType != 1) {
        throw "Only elements and text nodes allowed.";
      } else {
        var tag = iter.tagName.toLowerCase();
        if (inlines.test(tag)) {
          throw "Inlines not allowed in body.";
        } else if (tag == 'br') {
          throw "Line breaks are not allowed in body.";
        } else if (blocks.test(tag)) {
          (validators[tag] || validators['!'])(iter);
//          if (iter.previousSibling && iter.previousSibling.nodeType != 3)
 //           throw "New line separator missing.";
        } else {
          throw "Forbidden element " + tag;
        }
      }
      iter = iter.nextSibling;   
    }
  }

  Swimlane.copacetic = copacetic;

  function flatten (node) {
    var parent = node.parentNode;
    var before = node.nextSibling;
    var previousSibling = node.previousSibling;
    while (node.firstChild != null) {
      parent.insertBefore(node.removeChild(node.firstChild), before);
    }
    parent.removeChild(node);
    return previousSibling == null ? parent.firstChild : previousSibling.nextSibling;
  }

  function hasTextAfter(node) {
    var next = node.nextSibling;
    while (next && next.nodeType == 3) {
      if (next.data.length != 0) {
        return true;
      }
      next = next.nextSibling;
    }
    return false;
  }

  function hasTextBefore(node) {
    var prev = node.previousSibling;
    while (prev && prev.nodeType == 3) {
      if (prev.data.length != 0) {
        return true;
      }
      prev = prev.previousSibling;
    }
    return false;
  }

  var validators = {
    p: function(para) {
      if (para.firstChild.nodeType == 3 && /^\s/.test(para.firstChild.data)) 
        throw new Error("Unnormalized whitespace.");
      var iter = para.firstChild;
      var endsWithSpace = false;
      while (iter != null) {
        if (iter.nodeType == 1)  {
          endsWithSpace = false;
          var tag = iter.tagName.toLowerCase();
          if (inlines.test(tag)) {
            (validators[tag] || validators['@'])(iter);
          } else {
            throw new Error("Invalid element <" + tag + "> in paragraph.");
          }
        } else if (iter.nodeType == 3) {
          if (iter.previousSibling && iter.previousSibling.nodeType == 3 && endsWithSpace) {
            if (/^[ \t\r\n]/.test(iter.data)) {
              throw new Error("Text should be normalized.");
            }
          }
          if (/[ \t\r\n][ \t\r\n]/.test(iter.data)) {
            throw "Text should be normalized.";
          }
          endsWithSpace = /[ \t\r\n]/.test(iter.data);
        } else {
          throw "Only elements and text nodes allowed.";
        }
        iter = iter.nextSibling;
      }
    },
    br: function(e) {
      var prev = e.previousSibling;
      var placeholder = $(e).hasClass("__swimlane__placeholder");
      if (placeholder) {
        if (hasTextBefore(e) || hasTextAfter(e)) {
          throw new Error("A block cannot end with a placehodler <br>.");
        }
      } else {
        if ((prev == null || !hasTextBefore(e)) && hasTextAfter(e)) {
          throw new Error("A block cannot begin with a <br> unless it is a placeholder.");
        }
      }
      var next = e.nextSibling;
      if (next != null) {
        if (next.nodeType != 3)
          throw "There is always a text node after a br.";
        if (/^\s/.test(next.data))
          throw "There is never whitespace after a br.";
      }
    },
    span: function (node) {
      if (!($(node).hasClass("__swimlane__placeholder") && characterCount(node) == 0)) {
        throw Error("Invalid element <span> in paragraph.");
      }
      return node.nextSibling;
    },
    '!': function(e) {
    },
    '@': function(e) {
    }
  };
  var normalizers =  {
    body: function(body, s) {
    },
    li: function(li) {
      var doc = self.document;
      var iter = li.firstChild;
      var next = null;
      while (next == null && iter != null) {
        if ((iter = self.text(iter)).nodeType == 3) {
          iter = iter.nextSibling;
        }
        else if (iter.nodeType == 1) {
          var tag = iter.tagName.toLowerCase();
          if (self.inlines.test(tag)) {
            iter = (self.normalizers[tag] || self.normalizers['@'])(iter);
          }
          else if (/^br|ul|ol$/.test(tag)) {
            iter = (self.normalizers[tag] || self.normalizers['!'])(iter);
          }
          else {
            self.flatten(iter);
          }
        }
      }
      if (next == null) {
          next = li.nextSibling;
          self.trim(li);
      }
      return next;
    },
    ul: function(ul) {
      var doc = self.document;
      var iter = ul.firstChild;
      var next = null;
      while (next == null && iter != null) {
        if ((iter = self.text(iter)).nodeType == 3) {
          if (iter.data != '\n') {
            var root = $(iter).parents('.swimlane > *').get(0);
            if (root == null) root = ul;
            var p = doc.createTextNode('p');
            p.appendChild(ul.removeChild(iter));
            root.parentNode.insertBefore(p, root);
            next = root;
          }
          else {
            iter = iter.nextSibling;
          }
        }
        else if (iter.nodeType == 1) {
          if (iter.tagName.toLowerCase() == 'li') {
            iter = self.normalizers['li'](iter);
            if (iter != null && iter.parentNode != ul) next = iter;
          }
          else {
          }
        }
        else {
          iter = self.remove(iter);
        }
      }
      if (next == null) next = ul.nextSibling;
      return next;
    },
    p: function(factory, para, cursor) {
      function advance(iter, next) {
        return next === iter ? next.nextSibling : next;
      }
      var iter = para.firstChild;
      var next = null;
      while (next == null && iter != null) {
        if ((iter = text(factory, iter, cursor)).nodeType == 3) {
          iter = iter.nextSibling;
        } else if (iter.nodeType == 1) {
          if (inlines.test(iter.tagName)) {
            var tag = iter.tagName.toLowerCase();
            var iter = advance(iter, (normalizers[tag] || normalizers["@"])(factory, iter, cursor));
          } else if (blocks.test(iter.tagName)) {
            var prev = iter.previousSibling;
            var parent = para.parentNode;
            var before = para.nextSibling;
            var block = para.removeChild(iter);
            parent.insertBefore(block, before);
            for(;;) {
              var after = prev == null ? para.firstChild : prev.nextSibling;
              if (after == null) break;
              parent.insertBefore(para.removeChild(after), before);
            } 
            next = block;
          } else {
            var after = iter.firstChild || iter.nextSibling;
            while (iter.firstChild != null) {
              var child = iter.removeChild(iter.firstChild);
              para.insertBefore(child, iter);
            }
            para.removeChild(iter);
            iter = after;
          }
        } else {
            iter = remove(iter);
        }
      } 
      if (next == null) next = para.nextSibling;
      trim(factory, para);
      return next;
    },
    span: function (factory, node, cursor) {
      if (!($(node).hasClass("__swimlane__placeholder") && characterCount(node) == 0)) {
        return normalizers["@"](factory, node, cursor);
      }
      return node;
    },
    "@": function (factory, node, cursor) {
      var next = node.firstChild || node.nextSibling;
      if (cursor.node === node) 
        cursor.node = next;
      while (node.firstChild) 
        $(node.firstChild).insertBefore(node);
      $(node).remove();
      return next;
    },
    '@!': function(node, s) {
      var attributes = node.attributes;
      while (attributes.length != 0) {
        node.removeChild(attributes.item(0));
      }
      var iter = node.firstChild;
      while (iter != null) {
        if ((iter = self.text(iter)).nodeType == 3) {
          iter = iter.nextSibling;
        }
        else if (iter.nodeType == 1) {
          var tag = iter.tagName.toLowerCase();
          if (self.inlines.test(iter.tagName)) {
            (self.normalizers[tag] || self.normalizers['@'])(iter);
          }
          else {
            var before = iter;
            while (iter.firstChild != null) 
              node.insertBefore(iter.removeChild(iter.firstChild), iter);
            iter = self.remove(iter);
          }
        }
        else {
          iter = self.remove(iter);
        }
      }
      return node.nextSibling;
    },
    br: function(factory, node) {
      var next = node.nextSibling;
      while (node.firstChild != null)
        node.removeChild(node.firstChild);
      if ($(node).hasClass("__swimlane__placeholder")) {
        if (hasTextBefore(node) || hasTextAfter(node)) 
          $(node).remove();
      } else if (!hasTextBefore(node)) {
          $(node).remove();
      }
      return next;
    },
    '!': function(node) {
      node.parentNode.removeChild(node);
    }
  };
  function remove (node) {
    var iter = node.nextSibling;
    node.parentNode.removeChild(node);
    return iter;
  }
  function trim (factory, node) {
    var children = node.childNodes;
    while (children.length > 0) {
      var first = children.item(0);
      if (first.nodeType == 3 && /^\s+/.test(first.data)) {
        var str = first.data.replace(/^\s+/, '');
        if (str.length > 0) {
          var text = factory.createTextNode(str);
          node.insertBefore(text, first);
        }
        node.removeChild(first);
      } else if (first.nodeType == 1 && /^br$/i.test(first.tagName)) {
       // node.removeChild(first);
        break;
      } else {
        break;
      }
    }
    while (children.length > 0) {
      var last = children.item(children.length - 1);
      if (last.nodeType == 3 && /\s+$/.test(last.data)) {
        var str = last.data.replace(/\s+$/, '');
        if (str.length > 0) {
          var text = factory.createTextNode(str);
          node.appendChild(text);
        }
        node.removeChild(last);
      } else if (last.nodeType == 1 && /^br$/i.test(last.tagName)) {
      //  node.removeChild(last);
        break;
      } else {
        break;
      }
    }
    if (children.length == 0) node.parentNode.removeChild(node);
  }

  // Wraps the given node in a new element with the given tag created using
  // the given factory.
  function wrap (factory, node, tag) {
    // If there is a previous node that is not text, insert a new line to
    // for 
    if (node.previousSibling != null && node.previousSibling.nodeType != 3) {
        var newline = factory.createTextNode("\n");
        body.insertBefore(newline, node);
    }
    var wrapper = factory.createElement(tag);
    node.parentNode.insertBefore(wrapper, node);
    wrapper.appendChild(node);
    return wrapper;
  }

  function normalize (factory, body, start, stop) {
    var cursor = Cursor.get();
    var iter = start ? start.nextSibling : body.firstChild;
    var append = null;
    if (iter && iter == stop) stop = stop.nextSibling;
    while (iter != stop) {
      if ((iter = text(factory, iter, cursor)).nodeType == 3) {
        if (iter.data != "\n") {
          if (append == null) append = wrap(factory, iter, "p");
          else append.appendChild(body.removeChild(iter));
          iter = append.nextSibling;
        } else {
          iter = iter.nextSibling;
        }
      } else if (iter.nodeType == 1) {
        var tag = iter.tagName.toLowerCase();
        if ((tag == 'br' || blocks.test(tag)) && append != null) {
            body.insertBefore(append, iter);
            self.normalizers['p'](append);
            append = null;
        }
        if (tag == 'br') {
          iter = self.remove(iter);
        } else if (inlines.test(tag)) {
          var next = (normalizers[tag] || normalizers["@"])(factory, iter, cursor);
          if (next === iter) {
            if (append == null) append = paragraph(iter);
            else append.appendChild(body.removeChild(iter));
            iter = append.nextSibling;
          } else {
            iter = next;
          }
        } else if (blocks.test(tag)) {
          iter = (normalizers[tag] || normalizers['!'])(factory, iter, cursor);
        } else {
          iter = flatten(iter);
        }
      } else {
          iter = self.remove(iter);
      }
    }

    if (append != null) {
        normalizers["p"](factory, append, cursor);
    }

    if (cursor.node && $.browser.msie) {
      while (cursor.node.nodeType == 3) {
        var prev = cursor.node.previousSibling;
        while (prev) {
          cursor.offset += characterCount(prev);
          prev = prev.previousSibling;
        }
        cursor.node = cursor.node.parentNode;
      }
    }
    return cursor;
  }

  // Called for each node, this method will normalize the node if it is a text
  // element, but if it is not a text element nothing is done.
  function text (factory, node, cursor) {
    // Process a text node. 
    var parentNode = node.parentNode;

    // If the node is CDATA convert it to text.
    if (node.nodeType == 4) {
      var text = factory.createTextNode(node.data);
      parentNode.insertBefore(text, node);
      parentNode.removeChild(node);
      node = text;
    }

    var prev = node.previousSibling;
    if (node.nodeType == 3) {
      // Combine adjacent text nodes. You'll notice that this means that we
      // might be reaching outside the range givne to us to normalize. That is
      // if fine. The boundary is guidance to save time, not a firewall.
      if (prev != null && prev.nodeType == 3) {
        var text = factory.createTextNode(prev.data + node.data);
        if (prev == cursor.node) {
          cursor.node = text;
        }
        parentNode.insertBefore(text, prev);
        parentNode.removeChild(prev);
        parentNode.removeChild(node);
        node = text;
      }

      // Remove duplicate whitespace.
      if (/\s\s/.test(node.data)) {
        var text = factory.createTextNode(node.data.replace(/\s\s+/g, " "));
        parentNode.insertBefore(text, node);
        parentNode.removeChild(node);
        node = text;
      }
    }

    return node;
  } 
  Swimlane.normalize = normalize;
})();
// vim: set ts=2 sw=2 nowrap:
