// swimlane.js
//
// Management and cross-browserization of HTML5 content editable controls.
//
(function () {
  window.Swimlane = function Swimlane (options) {
    $.extend(this, options);
    return this; 
  }
  
  var disabledValue;
  Swimlane.prototype = {
    toggle: function () {
      var swimlane = this;
      function keyup (e) { swimlane.keyup(e); }
      var value = $(this.selector).attr("contentEditable");
      if (value == "false" || value == "inherit") {
        $(this.selector).keyup(keyup);
        disabledValue = value;
        $(this.selector)[0].setAttribute("contentEditable", "true");
      } else {
        $(this.selector).unbind("keyup", keyup);
        $(this.selector)[0].setAttribute("contentEditable", disabledValue);
      }
    },
    toolbar: function () {
      var html = [];
      html.push("<div class='toolbar'>");
      html.push("<img class='button bold'>");
      html.push("<img class='button italic'>");
      html.push("<img class='separator'>");
      html.push("<img class='button link'>");
      html.push("<img class='button quote'>");
      html.push("<img class='separator'>");
      html.push("<img class='button ordered'>");
      html.push("<img class='button bullet'>");
      html.push("<img class='button header'>");
      html.push("<img class='button horizonal-rule'>");
      html.push("<img class='button horizonal-rule'>");
      html.push("</div>");
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
      var n = new Swimlane.Normalizer(document, $(this.selector)[0]);
      n.normalize({ start: null, stop: null });
    }
  };

  if ($.browser.webkit) {
    $.extend(Swimlane.prototype, {
      keyup: function (e) {
        if (e.keyCode == 13) {
          var editable = $(this.selector)[0];
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
  } else if ($.browser.mozilla) {
    $.extend(Swimlane.prototype, {
      keyup: function (e) {
        if (e.keyCode == 13) {
          var parentNode = window.getSelection().anchorNode.parentNode;
          if (parentNode == $(this.selector)[0].parentNode) {
            document.execCommand("insertParagraph", false, null);
          }
        }
      }
    });
  } 

  Swimlane.Normalizer = function(doc, body) {
        var self = {
            inlines: /sub|strong|em|br/i,
            blocks: /ul|ol|p/i,
            content: /\S|^\n$/,
            document: doc,
            body: body
        };
        self.copacetic = function() {
            var iter = self.body.firstChild;
            while (iter != null) {
                if (iter.nodeType == 3) {
                    if (iter.data != '\n')
                        throw "Text content not allowed in body";
                }
                else if (iter.nodeType != 1) {
                    throw "Only elements and text nodes allowed.";
                }
                else {
                    var tag = iter.localName.toLowerCase();
                    if (self.inlines.test(tag)) {
                        throw "Inlines not allowed in body.";
                    }
                    else if (tag == 'br') {
                        throw "Line breaks are not allowed in body.";
                    }
                    else if (self.blocks.test(tag)) {
                        (self.tests[tag] || self.tests['!'])(iter);
                        if (iter.previousSibling && iter.previousSibling.nodeType != 3)
                            throw "New line separator missing.";
                    }
                    else {
                        throw "Forbidden element " + tag;
                    }
                }
                iter = iter.nextSibling;   
            }
        };
        self.text = function(node) {
            // Process a text node. 

            var doc = self.document;
            var p = node.parentNode;

            // If the node is CDATA convert it to text.
            if (node.nodeType == 4) {
                var text = doc.createTextNode(node.data);
                p.insertBefore(text, node);
                p.removeChild(node);
                node = text;
            }

            var prev = node.previousSibling;
            if (node.nodeType == 3) {
                // Combine adjacent text nodes.

                if (prev != null && prev.nodeType == 3) {
                    var text = doc.createTextNode(prev.data + node.data);
                    p.insertBefore(text, prev);
                    p.removeChild(prev);
                    p.removeChild(node);
                    node = text;
                }

                // Remove duplicate whitespace.
               
                if (/\s\s/.test(node.data)) {
                    var text = doc.createTextNode(node.data.replace(/\s\s+/g, ' '));
                    p.insertBefore(text, node);
                    p.removeChild(node);
                    node = text;
                }
            }

            // Normalize br.

            var prev = node.previousSibling;
            if (prev != null && prev.nodeType == 1 && /^br$/i.test(prev.localName)) {
                if (node.nodeType != 3) {
                    var text = document.createTextNode('\n');
                    p.insertBefore(text, node);
                }
                else if (node.nodeType == 3 && /^\s/m.test(node.data)) {
                    var text = doc.createTextNode(node.data.replace(/^\s+/m, ''));
                    p.insertBefore(text, node);
                    p.removeChild(node);
                    node = text;
                }
            }

            return node;
        }; 
        self.flatten = function(node) {
            var parent = node.parentNode;
            var before = node.nextSibling;
            var previousSibling = node.previousSibling;
            while (node.firstChild != null) {
                parent.insertBefore(node.removeChild(node.firstChild), before);
            }
            parent.removeChild(node);
            return previousSibling == null ? parent.firstChild : previousSibling.nextSibling;
        };
        self.tests = {
            p: function(para) {
                if (para.firstChild.nodeType == 3 && /^\s/.test(para.firstChild.data)) 
                    throw "Unnormalized whitespace.";
                if (para.lastChild.nodeType == 3 && /\s$/.test(para.lastChild.data)) 
                    throw "Unnormalized whitespace.";
                var iter = para.firstChild;
                while (iter != null) {
                    if (iter.nodeType == 1)  {
                        var tag = iter.localName.toLowerCase();
                        if (self.inlines.test(tag)) {
                            (self.tests[tag] || self.tests['@'])(iter);
                        }
                        else if (self.blocks.test(tag)) {
                            throw "Block elements are forbidden in p.";
                        }
                    }
                    else if (iter.nodeType == 3) {
                        if (iter.previousSibling && iter.previousSibling.nodeType == 3)
                            throw "Adjacent text nodes should be merged.";
                        if (/\s\s/.test(iter.data))
                            throw "Text should be normalized.";
                    }
                    else {
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
                        throw "There is awlays a newline before a br.";
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
        self.normalizers =  {
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
                        var tag = iter.localName.toLowerCase();
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
                        if (iter.localName.toLowerCase() == 'li') {
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
            p: function(para, s) {
                var doc = self.document;
                var iter = para.firstChild;
                var next = null;
                while (next == null && iter != null) {
                    if ((iter = self.text(iter)).nodeType == 3) {
                        iter = iter.nextSibling;
                    }
                    else if (iter.nodeType == 1) {
                        if (self.inlines.test(iter.localName)) {
                            var tag = iter.localName.toLowerCase();
                            (self.normalizers[tag] || self.normalizers['@'])(iter);
                            iter = iter.nextSibling;
                        }
                        else if (self.blocks.test(iter.localName)) {
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
                self.trim(para);
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
                        var tag = iter.localName.toLowerCase();
                        if (self.inlines.test(iter.localName)) {
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
        self.remove = function(node) {
            var iter = node.nextSibling;
            node.parentNode.removeChild(node);
            return iter;
        };
        self.trim = function(node) {
            var doc = this.document;
            var children = node.childNodes;
            while (children.length > 0) {
                var first = children.item(0);
                if (first.nodeType == 3 && /^\s+/.test(first.data)) {
                    var str = first.data.replace(/^\s+/, '');
                    if (str.length > 0) {
                        var text = doc.createTextNode(str);
                        node.insertBefore(text, first);
                    }
                    node.removeChild(first);
                }
                else if (first.nodeType == 1 && /^br$/i.test(first.localName)) {
                    node.removeChild(first);
                }
                else {
                    break;
                }
            }
            while (children.length > 0) {
                var last = children.item(children.length - 1);
                if (last.nodeType == 3 && /\s+$/.test(last.data)) {
                    var str = last.data.replace(/\s+$/, '');
                    if (str.length > 0) {
                        var text = doc.createTextNode(str);
                        node.appendChild(text);
                    }
                    node.removeChild(last);
                }
                else if (last.nodeType == 1 && /^br$/i.test(last.localName)) {
                    node.removeChild(last);
                }
                else {
                    break;
                }
            }
            if (children.length == 0) node.parentNode.removeChild(node);
        };
        self.paragraph = function(node) {
            var doc = self.document;
            var body = self.body;
            if (node.previousSibling != null && node.previousSibling.nodeType != 3) {
                var newline = doc.createTextNode('\n');
                body.insertBefore(newline, node);
            }
            var p = doc.createElement('p');
            body.insertBefore(p, node);
            p.appendChild(node);
            return p;
        };
        self.normalize = function(ascent) {
            var doc = self.document;
            var body = self.body;
            var iter = ascent.start ? ascent.start.nextSibling
                                    : body.firstChild;
            var append = null;
            var stop = ascent.stop;
            if (iter == stop) stop = stop.nextSibling;
            while (iter != stop) {
                if ((iter = self.text(iter)).nodeType == 3) {
                    if (iter.data != '\n') {
                        if (append == null) append = self.paragraph(iter);
                        else append.appendChild(body.removeChild(iter));
                        iter = append.nextSibling;
                    }
                    else {
                        iter = iter.nextSibling;
                    }
                }
                else if (iter.nodeType == 1) {
                    var wrap = false;
                    var tag = iter.localName.toLowerCase();
                    if ((tag == 'br' || self.blocks.test(tag)) && append != null) {
                        body.insertBefore(append, iter);
                        self.normalizers['p'](append);
                        append = null;
                    }
                    if (tag == 'br') {
                        iter = self.remove(iter);
                        wrap = true;
                    }
                    else if (self.inlines.test(tag)) {
                        (self.normalizers[tag] || self.normalizers['@'])(iter);
                        if (append == null) append = self.paragraph(iter);
                        else append.appendChild(body.removeChild(iter));
                        iter = append.nextSibling;
                    }
                    else if (self.blocks.test(tag)) {
                        if (iter.previousSibling && iter.previousSibling.nodeType != 3) {
                            var newline = document.createTextNode('\n');
                            body.insertBefore(newline, iter);
                        }
                        iter = (self.normalizers[tag] || self.normalizers['!'])(iter);
                    }
                    else {
                        iter = self.flatten(iter);
                    }
                }
                else {
                    iter = self.remove(iter);
                }
            }

            if (append != null) {
                self.normalizers['p'](append);
            }
        }
        return self;
    }
})();
// vim: set ts=2 sw=2 nowrap:
