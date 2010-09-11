// swimlane.js
//
// Management and cross-browserization of HTML5 content editable controls.
//
(function () {
  var Swimlane = window.Swimlane = function (options) {
    $.extend(this, options);
  }
  var disabledValue;
  $.extend(Swimlane.prototype, {
    toggle: function () {
      var swimlane = this;
      var rebind = {};
      $.each("keyup keydown keypress".split(/\s+/), function (index, value) {
        rebind[value] = function (e) { return swimlane[value](e); };
      });
      var value = $(this.selector).attr("contentEditable");
      if (value == "false" || value == "inherit") {
        $.each(rebind, function (key, value) { $(swimlane.selector).bind(key, value); });
        disabledValue = value;
        $(this.selector)[0].setAttribute("contentEditable", "true");
      } else {
        $.each(rebind, function (key, value) { $(swimlane.selector).unbind(key, value); });
        $(this.selector)[0].setAttribute("contentEditable", disabledValue);
      }
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
//      console.warn("DOWN: " + e.keyCode + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      if (e.keyCode == 90 && e.metaKey) {
        e.preventDefault();
      }
    },
    keypress: function (e) {
    },
    keyup: function (e) {
      var editable = $(this.selector)[0];
      try {
        Swimlane.copacetic(editable);
      } catch (_) {
        Cursor.set(Swimlane.normalize(document, editable));
      }
      if (false && e.keyCode == 13) {
        var anchorNode = window.getSelection().anchorNode;
        if (anchorNode.tagName == "DIV") { //  && parentNode == editable) {
          var p = $("<p><br></p>").insertAfter($(anchorNode))[0];
          window.getSelection().selectAllChildren(editable);
          window.getSelection().collapse(p, 0);
          $(anchorNode).remove();
        }
      }
    }
  });
  
  var Cursor = {};
  if ($.browser.webkit || $.browser.mozilla) {
    $.extend(Cursor, {
      get: function () { 
        var selection = window.getSelection();
        return { node: selection.focusNode, offset: selection.focusOffset };
      },
      set: function (cursor) {
        window.getSelection().collapse(cursor.node, cursor.offset);
      }
    });
  } else if ($.browser.msie) {
    (function () {
      var count = 0;
      $.extend(Cursor, {
        get: function () {
          count++;
          var range = document.selection.createRange();
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
          return { node: range.parentElement(), offset: offset }
        },
        set: function (cursor) {
          var range = document.body.createTextRange();
          range.moveToElementText(cursor.node);
          range.collapse();
          range.move("character", cursor.offset);
          range.select();
        }
      });
    })();
  } 

  var inlines =  /sub|strong|em|br/i,
      blocks = /ul|ol|p/i,
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
          if (iter.previousSibling && iter.previousSibling.nodeType != 3)
            throw "New line separator missing.";
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
  var validators = {
    p: function(para) {
      if (para.firstChild.nodeType == 3 && /^\s/.test(para.firstChild.data)) 
        throw new Error("Unnormalized whitespace.");
      if (para.lastChild.nodeType == 3 && /\s$/.test(para.lastChild.data)) 
        throw new Error("Unnormalized whitespace.");
      var iter = para.firstChild;
      while (iter != null) {
        if (iter.nodeType == 1)  {
          var tag = iter.tagName.toLowerCase();
          if (inlines.test(tag)) {
            (validators[tag] || validators['@'])(iter);
          } else {
            throw new Error("Invalid element <" + tag + "> in paragraph.");
          }
        } else if (iter.nodeType == 3) {
          if (iter.previousSibling && iter.previousSibling.nodeType == 3)
            throw "Adjacent text nodes should be merged.";
          if (/\s\s/.test(iter.data))
            throw "Text should be normalized.";
        } else {
          throw "Only elements and text nodes allowed.";
        }
        iter = iter.nextSibling;
      }
    },
    br: function(e) {
      var prev = e.previousSibling;
      if (prev != null) {
        if (prev.nodeType != 3)
          throw "There is always a text node before a br.";
        if (!/\n$/.test(prev.data))
          throw new Error("There is always a newline before a <br>.");
      }
      var next = e.nextSibling;
      if (next == null)
        throw "Pointless br.";
      if (next.nodeType != 3)
        throw "There is always a text node after a br.";
      if (/^\s/.test(next.data))
        throw "There is never whitespace after a br.";
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
    p: function(factory, para, s) {
      var iter = para.firstChild;
      var next = null;
      while (next == null && iter != null) {
        if ((iter = text(factory, iter)).nodeType == 3) {
          iter = iter.nextSibling;
        }
        else if (iter.nodeType == 1) {
          if (self.inlines.test(iter.tagName)) {
            var tag = iter.tagName.toLowerCase();
            (self.normalizers[tag] || self.normalizers['@'])(iter);
            iter = iter.nextSibling;
          }
          else if (self.blocks.test(iter.tagName)) {
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
          }
          else {
            var after = iter.firstChild || iter.nextSibling;
            while (iter.firstChild != null) {
              var child = iter.removeChild(iter.firstChild);
              para.insertBefore(child, iter);
            }
            para.removeChild(iter);
            iter = after;
          }
        }
        else {
            iter = self.remove(iter);
        }
      } 
      if (next == null) next = para.nextSibling;
      trim(factory, para);
      return next;
    },
    '@': function(node, s) {
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
    br: function(node) {
      while (node.firstChild != null)
        node.removeChild(node.firstChild);
      var prev = node.previousSibling;
      if (prev != null && prev.nodeType == 3 && !/\n$/m.test(prev.data)) {
        var text = document.createTextNode(prev.data.replace(/\s+$/, '') + '\n');
        node.parentNode.insertBefore(text, node);
        node.parentNode.removeChild(prev);
      }
      return node.nextSibling;
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
        node.removeChild(first);
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
        node.removeChild(last);
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
    if (!stop) stop = iter.nextSibling;
    if (iter == stop) stop = stop.nextSibling;
    while (iter != stop) {
      if ((iter = text(factory, iter)).nodeType == 3) {
        if (iter.data != "\n") {
          if (append == null) append = wrap(factory, iter, "p");
          else append.appendChild(body.removeChild(iter));
          iter = append.nextSibling;
        } else {
          iter = iter.nextSibling;
        }
      } else if (iter.nodeType == 1) {
        var tag = iter.tagName.toLowerCase();
        if ((tag == 'br' || self.blocks.test(tag)) && append != null) {
            body.insertBefore(append, iter);
            self.normalizers['p'](append);
            append = null;
        }
        if (tag == 'br') {
            iter = self.remove(iter);
        } else if (self.inlines.test(tag)) {
            (self.normalizers[tag] || self.normalizers['@'])(iter);
            if (append == null) append = self.paragraph(iter);
            else append.appendChild(body.removeChild(iter));
            iter = append.nextSibling;
        } else if (self.blocks.test(tag)) {
            if (iter.previousSibling && iter.previousSibling.nodeType != 3) {
                var newline = factory.createTextNode('\n');
                body.insertBefore(newline, iter);
            }
            iter = (self.normalizers[tag] || self.normalizers['!'])(iter);
        } else {
            iter = self.flatten(iter);
        }
      } else {
          iter = self.remove(iter);
      }
    }

    if (append != null) {
        normalizers["p"](factory, append);
    }

    return cursor;
  }

  // Called for each node, this method will normalize the node if it is a text
  // element, but if it is not a text element nothing is done.
  function text (factory, node) {
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

    // Break the text with new line if it is near a <br> so that HTML code is
    // nicely formatted.
    var prev = node.previousSibling;
    if (prev != null && prev.nodeType == 1 && /^br$/i.test(prev.tagName)) {
      if (node.nodeType != 3) {
        var text = factory.createTextNode("\n");
        parentNode.insertBefore(text, node);
      } else if (node.nodeType == 3 && /^\s/m.test(node.data)) {
        var text = factory.createTextNode(node.data.replace(/^\s+/m, ''));
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
