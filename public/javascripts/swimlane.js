(function() {
  var Cursor, Swimlane, advance, blocks, characterCount, console, containers, content, hasTextAfter, hasTextBefore, inlines, normalizeText, normalizers, say, tag, text, trim, validators, wrap, _i, _len, _ref,
    __slice = Array.prototype.slice;

  console = window.console || {
    log: function() {
      return true;
    }
  };

  say = function() {
    var splat;
    splat = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return console.log.apply(console, splat);
  };

  Swimlane = (function() {

    function Swimlane(selector) {
      var event, _fn, _i, _len, _ref,
        _this = this;
      this.selector = selector;
      this.rebind = {};
      _ref = "keyup keydown keypress paste".split(/\s/);
      _fn = function(event) {
        return _this.rebind[event] = function(e) {
          return _this[event](e);
        };
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        event = _ref[_i];
        _fn(event);
      }
    }

    Swimlane.prototype.toggle = function() {
      var editor, event, handler, node, text, value, _ref, _ref2;
      editor = $(this.selector);
      node = editor[0];
      value = editor.attr("contentEditable");
      if (value === "false" || value === "inherit") {
        this.disabledValue = value;
        _ref = this.rebind;
        for (event in _ref) {
          handler = _ref[event];
          editor.bind(event, handler);
        }
        Swimlane.normalize(document, node);
        node.setAttribute("contentEditable", "true");
        if (!node.firstChild || characterCount(node.firstChild) === 0) {
          editor.append("<p><br class='__swimlane__placeholder'></p>");
        }
        while (node.firstChild && node.firstChild.nodeType !== 3 && node.firstChild.tagName !== "BR") {
          node = node.firstChild;
        }
        if (!node.firstChild || node.firstChild !== 3) {
          text = node.insertBefore(document.createTextNode(""), node.firstChild);
          node = text;
        }
        if (node.firstChild) node = node.firstChild;
        (new Cursor()).select(node, 0);
      } else {
        _ref2 = this.rebind;
        for (event in _ref2) {
          handler = _ref2[event];
          editor.unbind(event, handler);
        }
        node.setAttribute("contentEditable", this.disabledValue);
      }
      return this;
    };

    Swimlane.prototype.unbind = function() {
      if (this.editing()) this.toggle();
      return this;
    };

    Swimlane.prototype.editing = function() {
      return $(this.selector).attr("contentEditable") === "true";
    };

    Swimlane.prototype.paste = function(event) {};

    Swimlane.prototype.keydown = function(e) {
      console.log("DOWN: " + e.keyCode + ", " + e.charCode + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      if (e.keyCode === 13) {
        e.preventDefault();
        if (!$.browser.mozilla) this.keypress(e);
      }
      return true;
    };

    Swimlane.prototype.keypress = function(e) {
      var charCode, cursor, node, selected;
      console.log("PRESS: " + e.keyCode + ", " + e.charCode + ", " + e.which + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      charCode = e.charCode;
      if (charCode >= 0x20 && !(charCode >= 0x7f && charCode < 0xA0) && charCode !== 0xAD && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        (new Cursor).update().append(String.fromCharCode(charCode)).select();
      } else if (e.keyCode === 13) {
        e.preventDefault();
        cursor = (new Cursor()).update();
        node = document.createElement(cursor.block.tagName);
        if (cursor.offset === characterCount(cursor.node)) {
          node.appendChild(document.createTextNode(""));
          selected = $("<br class='__swimlane__placeholder'>").appendTo(node);
          $(node).insertAfter(cursor.block);
          cursor.select(node, 0);
        } else if (containers[cursor.block.tagName]) {
          cursor.enter();
        }
      }
      return true;
    };

    Swimlane.prototype.keyup = function(e) {
      var cursor, editable;
      console.log("UP: " + e.keyCode + ", " + e.altKey + ", " + e.metaKey + ", " + e.ctrlKey);
      if (e.keyCode === 13) e.preventDefault();
      if (e.keyCode !== 13) {
        editable = $(this.selector)[0];
        try {
          Swimlane.copacetic(editable);
        } catch (_) {
          console.log("Dirty.");
          cursor = Swimlane.normalize(document, editable);
          cursor.select();
        }
      }
      return true;
    };

    return Swimlane;

  })();

  normalizeText = function(data, trailing) {
    data = data.replace(/[ \n\r\t][ \r\n\t]+/g, " ").replace(/^[ \n\r\t]+/, "");
    if (trailing) {
      return data.replace(/[ \n\r\t]+$/, "");
    } else {
      return data;
    }
  };

  characterCount = function(node) {
    var count, iterator, stack;
    if (node.nodeType === 3) return node.data.length;
    stack = [node];
    iterator = node.firstChild;
    count = 0;
    if (iterator) {
      while (true) {
        if (iterator.nodeType === 3) {
          count += normalizeText(iterator.data, true).length;
        }
        if (iterator.firstChild) {
          stack.push(iterator);
          iterator = iterator.firstChild;
        } else {
          while (true) {
            if (node === iterator) return count;
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
  };

  Cursor = (function() {

    function Cursor() {}

    Cursor.prototype.update = function() {
      var node, selection;
      selection = window.getSelection();
      node = selection.focusNode;
      this.node = node;
      this.offset = selection.focusOffset;
      this.selection = selection;
      this.block = node ? node.parentNode : null;
      return this;
    };

    Cursor.prototype.select = function(node, offset) {
      var _ref;
      if ((node != null) && (offset != null)) {
        _ref = [node, offset], this.node = _ref[0], this.offset = _ref[1];
      }
      window.getSelection().collapse(this.node, this.offset);
      return this;
    };

    Cursor.prototype.enter = function() {
      var insert, next, split;
      if (this.offset === characterCount(this.node)) {} else if (containers[this.block.tagName]) {
        split = document.createElement(this.block.tagName);
        next = this.node.splitText(this.offset);
        this.node = next;
        this.offset = 0;
        while (true) {
          insert = next;
          next = next.nextSibling;
          split.appendChild(insert);
          if (!next) break;
        }
        $(split).insertAfter(this.block);
        this.select();
      }
      return this;
    };

    Cursor.prototype.append = function(text) {
      var after, before, data;
      if (!this.selection.isCollapsed) this.collapse();
      this.textNodeZoom(this);
      if (this.node.data.length === 0 && this.node.previousSibling && $(this.node.previousSibling).hasClass("__swimlane__placeholder")) {
        $(this.node.previousSibling).remove();
      }
      if (this.node.data.length !== this.offset) {
        data = this.node.data;
        before = data.substring(0, this.offset);
        after = data.substring(this.offset);
        this.node.data = "" + before + text + after;
      } else {
        if (!this.node.nextSibling && text === " ") text = "\u00A0";
        this.node.data += text;
      }
      this.offset++;
      return this;
    };

    Cursor.prototype.textNodeZoom = function(cursor) {
      var text;
      if (this.node.nodeType === 1) {
        text = document.createTextNode("");
        cursor.node = this.node.insertBefore(text, this.node.firstChild);
        cursor.offset = 0;
      }
      return this;
    };

    return Cursor;

  })();

  containers = {};

  inlines = /^span|sub|strong|em|br$/i;

  blocks = /^ul|ol|p$/i;

  content = /\S|^\n$/;

  _ref = "LI P".split(/\s+/);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    tag = _ref[_i];
    containers[tag] = true;
  }

  Swimlane.copacetic = function(body) {
    var iter;
    iter = body.firstChild;
    while (iter !== null) {
      if (iter.nodeType === 3) {
        if (iter.data !== "\n") {
          throw new Error("Text content not allowed in body");
        }
      } else if (iter.nodeType !== 1) {
        throw new Error("Only elements and text nodes allowed.");
      } else {
        tag = iter.tagName.toLowerCase();
        if (inlines.test(tag)) {
          throw new Error("Inlines not allowed in body.");
        } else if (tag === "br") {
          throw new Error("Line breaks are not allowed in body.");
        } else if (blocks.test(tag)) {
          (validators[tag] || validators['!'])(iter);
        } else {
          throw new Error("Forbidden element " + tag);
        }
      }
      iter = iter.nextSibling;
    }
    return true;
  };

  hasTextAfter = function(node) {
    var next;
    next = node.nextSibling;
    while (next && next.nodeType === 3) {
      if (next.data.length !== 0) return true;
      next = next.nextSibling;
    }
    return false;
  };

  hasTextBefore = function(node) {
    var prev;
    prev = node.previousSibling;
    while (prev && prev.nodeType === 3) {
      if (prev.data.length !== 0) return true;
      prev = prev.previousSibling;
    }
    return false;
  };

  validators = {
    p: function(para) {
      var endsWithSpace, iter, _results;
      if (para.firstChild.nodeType === 3 && /^\s/.test(para.firstChild.data)) {
        throw new Error("Unnormalized whitespace.");
      }
      iter = para.firstChild;
      endsWithSpace = false;
      _results = [];
      while (iter !== null) {
        if (iter.nodeType === 1) {
          endsWithSpace = false;
          tag = iter.tagName.toLowerCase();
          if (inlines.test(tag)) {
            (validators[tag] || validators['@'])(iter);
          } else {
            throw new Error("Invalid element <" + tag + "> in paragraph.");
          }
        } else if (iter.nodeType === 3) {
          if (iter.previousSibling && iter.previousSibling.nodeType === 3 && endsWithSpace && /^[ \t\r\n]/.test(iter.data)) {
            throw new Error("Text should be normalized.");
          }
          if (/[ \t\r\n][ \t\r\n]/.test(iter.data)) {
            throw "Text should be normalized.";
          }
          if (/[^ \t\r\n\u00a0]\u00a0./.test(iter.data)) {
            throw "Text should be normalized.";
          }
          endsWithSpace = /[ \t\r\n]/.test(iter.data);
        } else {
          throw new Error("Only elements and text nodes allowed.");
        }
        _results.push(iter = iter.nextSibling);
      }
      return _results;
    },
    br: function(e) {
      var next, placeholder, prev;
      prev = e.previousSibling;
      placeholder = $(e).hasClass("__swimlane__placeholder");
      if (placeholder) {
        if (hasTextBefore(e) || hasTextAfter(e)) {
          throw new Error("A block cannot end with a placehodler <br>.");
        }
      } else {
        if ((prev === null || !hasTextBefore(e)) && hasTextAfter(e)) {
          throw new Error("A block cannot begin with a <br> unless it is a placeholder.");
        }
      }
      next = e.nextSibling;
      if (next !== null) {
        if (next.nodeType !== 3) {
          throw new Error("There is always a text node after a br.");
        }
        if (/^\s/.test(next.data)) {
          throw new Error("There is never whitespace after a br.");
        }
      }
    },
    span: function(node) {
      if (!($(node).hasClass("__swimlane__placeholder") && characterCount(node) === 0)) {
        throw Error("Invalid element <span> in paragraph.");
      }
      return node.nextSibling;
    },
    "@": function(e) {}
  };

  advance = function(iter, next) {
    if (next === iter) {
      return next.nextSibling;
    } else {
      return next;
    }
  };

  normalizers = {
    p: function(factory, para, cursor) {
      var after, before, block, child, iter, next, parent, prev;
      iter = para.firstChild;
      next = null;
      while (next === null && iter !== null) {
        if ((iter = text(factory, iter, cursor)).nodeType === 3) {
          iter = iter.nextSibling;
        } else if (iter.nodeType === 1) {
          if (inlines.test(iter.tagName)) {
            tag = iter.tagName.toLowerCase();
            iter = advance(iter, (normalizers[tag] || normalizers["@"])(factory, iter, cursor));
          } else if (blocks.test(iter.tagName)) {
            prev = iter.previousSibling;
            parent = para.parentNode;
            before = para.nextSibling;
            block = para.removeChild(iter);
            parent.insertBefore(block, before);
            while (true) {
              after = prev === null ? para.firstChild : prev.nextSibling;
              if (after === null) break;
              parent.insertBefore(para.removeChild(after), before);
            }
            next = block;
          } else {
            after = iter.firstChild || iter.nextSibling;
            while (iter.firstChild !== null) {
              child = iter.removeChild(iter.firstChild);
              para.insertBefore(child, iter);
            }
            para.removeChild(iter);
            iter = after;
          }
        } else {
          iter = remove(iter);
        }
      }
      if (next === null) next = para.nextSibling;
      trim(factory, para);
      return next;
    },
    span: function(factory, node, cursor) {
      if (!($(node).hasClass("__swimlane__placeholder") && characterCount(node) === 0)) {
        return normalizers["@"](factory, node, cursor);
      }
      return node;
    },
    "@": function(factory, node, cursor) {
      var next;
      next = node.firstChild || node.nextSibling;
      if (cursor.node === node) cursor.node = next;
      while (node.firstChild) {
        $(node.firstChild).insertBefore(node);
      }
      $(node).remove();
      return next;
    },
    br: function(factory, node) {
      var next;
      next = node.nextSibling;
      while (node.firstChild !== null) {
        node.removeChild(node.firstChild);
      }
      if ($(node).hasClass("__swimlane__placeholder")) {
        if (hasTextBefore(node) || hasTextAfter(node)) $(node).remove();
      } else if (!hasTextBefore(node)) {
        $(node).remove();
      }
      return next;
    },
    '!': function(node) {
      return node.parentNode.removeChild(node);
    }
  };

  trim = function(factory, node) {
    var children, first, last, str, text;
    children = node.childNodes;
    while (children.length > 0) {
      first = children.item(0);
      if (first.nodeType === 3 && /^\s+/.test(first.data)) {
        str = first.data.replace(/^\s+/, '');
        if (str.length > 0) {
          text = factory.createTextNode(str);
          node.insertBefore(text, first);
        }
        node.removeChild(first);
      } else if (first.nodeType === 1 && /^br$/i.test(first.tagName)) {
        break;
      } else {
        break;
      }
    }
    while (children.length > 0) {
      last = children.item(children.length - 1);
      if (last.nodeType === 3 && /\s+$/.test(last.data)) {
        str = last.data.replace(/\s+$/, '');
        if (str.length > 0) {
          text = factory.createTextNode(str);
          node.appendChild(text);
        }
        node.removeChild(last);
      } else if (last.nodeType === 1 && /^br$/i.test(last.tagName)) {
        break;
      } else {
        break;
      }
    }
    if (children.length === 0) return node.parentNode.removeChild(node);
  };

  wrap = function(factory, node, tag) {
    var newline, wrapper;
    if (node.previousSibling !== null && node.previousSibling.nodeType !== 3) {
      newline = factory.createTextNode("\n");
      body.insertBefore(newline, node);
    }
    wrapper = factory.createElement(tag);
    node.parentNode.insertBefore(wrapper, node);
    wrapper.appendChild(node);
    return wrapper;
  };

  text = function(factory, node, cursor) {
    var parentNode, prev;
    parentNode = node.parentNode;
    if (node.nodeType === 4) {
      text = factory.createTextNode(node.data);
      parentNode.insertBefore(text, node);
      parentNode.removeChild(node);
      if (cursor.node === node) cursor.node = text;
      node = text;
    }
    if (node.nodeType === 3) {
      prev = node.previousSibling;
      if (prev !== null && prev.nodeType === 3) {
        if (node === cursor.node) {
          cursor.node = prev;
          cursor.offset += prev.data.length;
        }
        parentNode.removeChild(node);
        prev.data += node.data;
        node = prev;
      }
      if (/[^ \n][^ \n]/.test(node.data)) {
        node.data = node.data.replace(/[ \n][ \n]+/g, " ");
      }
      if (/[^ \n]\u00a0./.test(node.data)) {
        node.data = node.data.replace(/([^ \n])\u00a0(.)/g, "$1 $2");
      }
    }
    return node;
  };

  Swimlane.normalize = function(factory, body, start, stop) {
    var append, cursor, iter, next;
    cursor = (new Cursor).update();
    iter = start ? start.nextSibling : body.firstChild;
    append = null;
    stop || (stop = null);
    if (iter && iter === stop) stop = stop.nextSibling;
    while (iter !== stop) {
      if ((iter = text(factory, iter, cursor)).nodeType === 3) {
        if (iter.data !== "\n") {
          if (append === null) {
            append = wrap(factory, iter, "p");
          } else {
            append.appendChild(body.removeChild(iter));
          }
          iter = append.nextSibling;
        } else {
          iter = iter.nextSibling;
        }
      } else if (iter.nodeType === 1) {
        tag = iter.tagName.toLowerCase();
        if ((tag === "br" || blocks.test(tag)) && append !== null) {
          body.insertBefore(append, iter);
          self.normalizers['p'](append);
          append = null;
        }
        if (tag === "br") {
          iter = self.remove(iter);
        } else if (inlines.test(tag)) {
          next = (normalizers[tag] || normalizers["@"])(factory, iter, cursor);
          if (next === iter) {
            if (append === null) {
              append = paragraph(iter);
            } else {
              append.appendChild(body.removeChild(iter));
            }
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
    if (append !== null) normalizers["p"](factory, append, cursor);
    return cursor;
  };

  if (window.Swimlane == null) window.Swimlane = Swimlane;

}).call(this);
