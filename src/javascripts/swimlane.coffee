# Management and cross-browserization of HTML5 contentEditable and similar
# controls in modern browsers.

# Make sure we have a console even if Firebug is not open.
console = window.console or { log: -> true }
say = (splat...) -> console.log.apply console, splat

# The `Swimlane` class and namespace for helper functions and classes.
class Swimlane

  constructor: (@selector) ->
    # Create event rebindings that invoke member methods. These are created here
    # so they can be bound and unbound with toggle, hopefully avoiding IE leaks.
    @rebind = {}
    for event in  "keyup keydown keypress paste".split /\s/
      do (event) => @rebind[event] = (e)=> this[event](e)

  # Enable or disable the Swimlane editor.
  toggle: ->
    editor  = $(@selector)
    node    = editor[0]
    value   = editor.attr("contentEditable")

    # Show the editor.
    if value is "false" or value is "inherit"

      # Take not of the disabled value on this platform.
      @disabledValue = value

      # Bind our event handlers.
      for event, handler of @rebind
        editor.bind event, handler

      # Normalize before displaying editor.
      Swimlane.normalize document, node

      # Go into edit mode.
      node.setAttribute("contentEditable", "true")

      # If there is no content, if the div is an empty div, insert a paragraph
      # with a placeholder child node to keep the paragraph from collapsing.
      if not node.firstChild or characterCount(node.firstChild) is 0
        editor.append("<p><br class='__swimlane__placeholder'></p>")

      # Descend into the editor's children looking for the the first element
      # with a text node as a first child.
      while node.firstChild                     and
            node.firstChild.nodeType  isnt 3    and
            node.firstChild.tagName   isnt "BR"
          node = node.firstChild

      # If we didn't find a text node, add one.
      if !node.firstChild || node.firstChild != 3
        text = node.insertBefore(document.createTextNode(""), node.firstChild)
        node = text

      # If we are in W3C browser, move to the text node, but FIXME. We really
      # need to defer to the `Cursor` implementation, and not have cursor
      # details leak out into the rest of the code.
      if node.firstChild
        node = node.firstChild

      # Select the node.
      (new Cursor()).select(node, 0)

    # Hide the editor.
    else

      # Unbind our event handlers.
      for event, handler of @rebind
        editor.unbind event, handler

      # Remove the editable state.
      node.setAttribute("contentEditable", @disabledValue)

    this

  unbind: ->
    @toggle() if @editing()
    this

  editing: -> $(@selector).attr("contentEditable") == "true"

  paste: (event) ->

##### event "keydown"
# Key down disables the control keys implemented by Swimlane; **enter** and
# **backspace**.

  # Handles the key down event `e`. If the browser is not Firefox, then
  # preventing default will also prevent `keypress` so we trigger our keypress
  # event explicitly if we prevent default on a non-Firefox browser.
  keydown: (e) ->
    console.log "DOWN: #{e.keyCode}, #{e.charCode}, #{e.altKey}, #{e.metaKey}, #{e.ctrlKey}"
    if e.keyCode is 13
      e.preventDefault()
      if not $.browser.mozilla
        @keypress(e)
    true

##### event "keypress"
# Key press intercepts, disables, and re-implements default editor behavior
# for printable characters, enter and delete.

  # Handle the `keypress` event `e`.
  keypress: (e) ->
    console.log "PRESS: #{e.keyCode}, #{e.charCode}, #{e.which}, #{e.altKey}, #{e.metaKey}, #{e.ctrlKey}"

    charCode  = e.charCode

    # For printable characters, insert the text at the cursor.
    if       charCode >= 0x20                     and
        not (charCode >= 0x7f && charCode < 0xA0) and
             charCode != 0xAD                     and
        not  e.metaKey                            and
        not  e.ctrlKey
      e.preventDefault()
      (new Cursor).update().append(String.fromCharCode(charCode)).select()

    # For enter, append a blank block or break the current block.
    else if e.keyCode is 13
      e.preventDefault()

      cursor  = (new Cursor()).update()
      node    = document.createElement(cursor.block.tagName)

      if (cursor.offset == characterCount(cursor.node))
        node.appendChild(document.createTextNode(""))
        selected = $("<br class='__swimlane__placeholder'>").appendTo(node)
        $(node).insertAfter(cursor.block)
        cursor.select(node, 0)

      # A not too difficult split of a top level block.
      else if (containers[cursor.block.tagName])
        cursor.enter()

    true

  keyup: (e) ->
    console.log "UP: #{e.keyCode}, #{e.altKey}, #{e.metaKey}, #{e.ctrlKey}"
    if e.keyCode is 13
      e.preventDefault()
    if e.keyCode != 13
      editable = $(@selector)[0]
      try
        Swimlane.copacetic(editable)
      catch _
        console.log "Dirty."
        cursor = Swimlane.normalize(document, editable)
        cursor.select()
    true

normalizeText = (data, trailing) ->
  data =  data.replace(/[ \n\r\t][ \r\n\t]+/g, " ").replace(/^[ \n\r\t]+/, "")
  if trailing then data.replace(/[ \n\r\t]+$/, "") else data

# Becoming important to get this right. Probably worth unit testing.
characterCount = (node) ->
  # Simply return the data length if the node has no children.
  return node.data.length if node.nodeType is 3

  # Use a stack to track descent into the tree.
  stack     = [ node ]
  iterator  = node.firstChild
  count     = 0

  if iterator
    loop
      if iterator.nodeType is 3
        count += normalizeText(iterator.data, true).length
      if iterator.firstChild
        stack.push iterator
        iterator = iterator.firstChild
      else
        loop
          if node is iterator
            return count
          if iterator.nextSibling
            iterator = iterator.nextSibling
          else
            iterator = stack.pop()
  count


#### Cursor Management with Swimlane.Cursor
# All modern browsers share the same text seelction API except for Internet
# explorer, where it is wildly different.
#
# We define a simplified API and create two completely separate
# implementations, one for Internet Explorer and one for all other W3C browsers.
#
# ------------------------------------------------------------------------------

# The W3C Selection Cursor class.
class Cursor

  # Intialize this cursor with the current position and return `this` cursor.
  update: ->
    selection   = window.getSelection()
    node        = selection.focusNode

    @node       = node
    @offset     = selection.focusOffset
    @selection  = selection
    @block      = if node then node.parentNode else null

    this

  select: (node, offset) ->
    [@node, @offset] = [node, offset] if node? and offset?

    window.getSelection().collapse(@node, @offset)

    this

  enter: ->
    if @offset is characterCount(@node)
    else if containers[@block.tagName]
      split = document.createElement(@block.tagName)
      next = @node.splitText(@offset)
      @node = next
      @offset = 0
      loop
        insert = next
        next = next.nextSibling
        split.appendChild(insert)
        break if not next
      $(split).insertAfter(@block)
      @select()
    this

  append: (text) ->
    if (!@selection.isCollapsed)
      @collapse()
    @textNodeZoom(this)

    # FIXME Is this working anymore?
    if @node.data.length == 0   and
       @node.previousSibling    and
       $(@node.previousSibling).hasClass("__swimlane__placeholder")
      $(@node.previousSibling).remove()

    if (@node.data.length != @offset)
      data    = @node.data
      before  = data.substring(0, @offset)
      after   = data.substring(@offset)
      @node.data = "#{before}#{text}#{after}"
    else
      if not @node.nextSibling and text is " "
        text = "\u00A0"
      @node.data += text

    @offset++

    this

  # If the cursor's current node is an element, create an empty string text node
  # and make it the first child of the element, and the focus node of the
  # cursor.
  textNodeZoom: (cursor) ->
    if @node.nodeType is 1
      text = document.createTextNode("")
      cursor.node = @node.insertBefore text, @node.firstChild
      cursor.offset = 0
    this


containers  = {}
inlines     =  /^span|sub|strong|em|br$/i
blocks      = /^ul|ol|p$/i
content     =  /\S|^\n$/

for tag in "LI P".split(/\s+/)
  containers[tag] = true

Swimlane.copacetic = (body) ->
  iter = body.firstChild
  while iter != null
    if iter.nodeType is 3
      if iter.data isnt "\n"
        throw new Error("Text content not allowed in body")
    else if iter.nodeType isnt 1
      throw new Error("Only elements and text nodes allowed.")
    else
      tag = iter.tagName.toLowerCase()
      if inlines.test tag
        throw new Error("Inlines not allowed in body.")
      else if tag is "br"
        throw new Error("Line breaks are not allowed in body.")
      else if blocks.test tag
        (validators[tag] or validators['!'])(iter)
#           if (iter.previousSibling && iter.previousSibling.nodeType != 3)
#           throw "New line separator missing.";
      else
        throw new Error("Forbidden element " + tag)
    iter = iter.nextSibling
  true

hasTextAfter = (node) ->
  next = node.nextSibling
  while next && next.nodeType == 3
    if next.data.length != 0
      return true
    next = next.nextSibling
  false

hasTextBefore = (node) ->
  prev = node.previousSibling
  while prev && prev.nodeType == 3
    if prev.data.length != 0
      return true
    prev = prev.previousSibling
  return false

validators =
  p: (para) ->
    if para.firstChild.nodeType is 3 and /^\s/.test(para.firstChild.data)
      throw new Error("Unnormalized whitespace.")
    iter = para.firstChild
    endsWithSpace = false
    while iter != null
      if iter.nodeType is 1
        endsWithSpace = false
        tag = iter.tagName.toLowerCase()
        if inlines.test(tag)
          (validators[tag] || validators['@'])(iter)
        else
          throw new Error("Invalid element <" + tag + "> in paragraph.")
      else if iter.nodeType is 3
        if iter.previousSibling               and
           iter.previousSibling.nodeType is 3 and
           endsWithSpace                      and
           /^[ \t\r\n]/.test(iter.data)
              throw new Error("Text should be normalized.")
        if (/[ \t\r\n][ \t\r\n]/.test(iter.data))
          throw "Text should be normalized."

        # Non-breaking space after non-whitespace and before anything.
        if (/[^ \t\r\n\u00a0]\u00a0./.test(iter.data))
          throw "Text should be normalized."

        endsWithSpace = /[ \t\r\n]/.test(iter.data)
      else
        throw new Error("Only elements and text nodes allowed.")
      iter = iter.nextSibling
  br: (e) ->
    prev = e.previousSibling
    placeholder = $(e).hasClass("__swimlane__placeholder")
    if placeholder
      if hasTextBefore(e) || hasTextAfter(e)
        throw new Error("A block cannot end with a placehodler <br>.")
    else
      if (prev == null || !hasTextBefore(e)) && hasTextAfter(e)
        throw new Error("A block cannot begin with a <br> unless it is a placeholder.")
    next = e.nextSibling
    if next != null
      if next.nodeType != 3
        throw new Error("There is always a text node after a br.")
      if /^\s/.test(next.data)
        throw new Error("There is never whitespace after a br.")
  span: (node) ->
    if !($(node).hasClass("__swimlane__placeholder") && characterCount(node) == 0)
      throw Error("Invalid element <span> in paragraph.")
    node.nextSibling
  "@": (e) ->

advance = (iter, next) ->
  if next is iter then next.nextSibling else next

normalizers =
  p: (factory, para, cursor) ->
    iter = para.firstChild
    next = null
    while next == null and iter != null
      if (iter = text(factory, iter, cursor)).nodeType == 3
        iter = iter.nextSibling
      else if iter.nodeType == 1
        if inlines.test(iter.tagName)
          tag = iter.tagName.toLowerCase()
          iter = advance(iter, (normalizers[tag] || normalizers["@"])(factory, iter, cursor))
        else if blocks.test(iter.tagName)
          prev = iter.previousSibling
          parent = para.parentNode
          before = para.nextSibling
          block = para.removeChild(iter)
          parent.insertBefore(block, before)
          loop
            after = if prev == null then para.firstChild else prev.nextSibling
            break if after == null
            parent.insertBefore(para.removeChild(after), before)
          next = block
        else
          after = iter.firstChild || iter.nextSibling
          while iter.firstChild != null
            child = iter.removeChild(iter.firstChild)
            para.insertBefore(child, iter)
          para.removeChild(iter)
          iter = after
      else
          iter = remove(iter)
    next = para.nextSibling if next == null
    trim(factory, para)
    next
  span: (factory, node, cursor) ->
    if !($(node).hasClass("__swimlane__placeholder") && characterCount(node) == 0)
      return normalizers["@"](factory, node, cursor)
    node
  "@": (factory, node, cursor) ->
    next = node.firstChild || node.nextSibling
    if cursor.node is node
      cursor.node = next
    while node.firstChild
      $(node.firstChild).insertBefore(node)
    $(node).remove()
    next
  br: (factory, node) ->
    next = node.nextSibling
    while (node.firstChild != null)
      node.removeChild(node.firstChild)
    if ($(node).hasClass("__swimlane__placeholder"))
      if (hasTextBefore(node) || hasTextAfter(node))
        $(node).remove()
    else if !hasTextBefore(node)
        $(node).remove()
    next
  '!': (node) ->
    node.parentNode.removeChild(node)

trim = (factory, node) ->
  children = node.childNodes
  while children.length > 0
    first = children.item(0)
    if first.nodeType == 3 && /^\s+/.test(first.data)
      str = first.data.replace(/^\s+/, '')
      if str.length > 0
        text = factory.createTextNode(str)
        node.insertBefore(text, first)
      node.removeChild(first)
    else if first.nodeType == 1 && /^br$/i.test(first.tagName)
      # node.removeChild(first);
      break
    else
      break
  while children.length > 0
    last = children.item(children.length - 1)
    if last.nodeType == 3 && /\s+$/.test(last.data)
      str = last.data.replace(/\s+$/, '')
      if str.length > 0
        text = factory.createTextNode(str)
        node.appendChild(text)
      node.removeChild(last)
    else if last.nodeType == 1 && /^br$/i.test(last.tagName)
      #  node.removeChild(last);
      break
    else
      break
  node.parentNode.removeChild(node) if children.length == 0

# Wraps the given node in a new element with the given tag created using the
# given factory.
wrap = (factory, node, tag) ->
  # If there is a previous node that is not text, insert a new line to for 
  if node.previousSibling != null && node.previousSibling.nodeType != 3
      newline = factory.createTextNode("\n")
      body.insertBefore(newline, node)
  wrapper = factory.createElement(tag)
  node.parentNode.insertBefore(wrapper, node)
  wrapper.appendChild(node)
  wrapper

# Called for each node, this method will normalize the node if it is a text
# element, but if it is not a text element nothing is done.
text = (factory, node, cursor) ->
  # Process a text node. 
  parentNode = node.parentNode

  # If the node is CDATA convert it to text.
  if node.nodeType == 4
    text = factory.createTextNode(node.data)
    parentNode.insertBefore(text, node)
    parentNode.removeChild(node)

    if cursor.node == node
      cursor.node = text

    node = text

  if node.nodeType is 3
    # Combine adjacent text nodes. You'll notice that this means that we
    # might be reaching outside the range givne to us to normalize. That is
    # if fine. The boundary is guidance to save time, not a firewall.
    prev = node.previousSibling
    if prev != null and prev.nodeType is 3

      if node == cursor.node
        cursor.node     = prev
        cursor.offset  += prev.data.length

      parentNode.removeChild(node)

      prev.data  += node.data
      node        = prev

    # Remove duplicate whitespace.
    if /[^ \n][^ \n]/.test(node.data)
      node.data = node.data.replace(/[ \n][ \n]+/g, " ")

    # Convert non-breaking spaces between non-whitespace.
    if /[^ \n]\u00a0./.test(node.data)
      node.data = node.data.replace(/([^ \n])\u00a0(.)/g, "$1 $2")

  node

Swimlane.normalize = (factory, body, start, stop) ->
  cursor = (new Cursor).update()
  iter = if start then start.nextSibling else body.firstChild
  append = null
  stop or= null
  stop = stop.nextSibling if iter && iter is stop
  while iter != stop
    if (iter = text(factory, iter, cursor)).nodeType == 3
      if iter.data != "\n"
        if append == null
          append = wrap(factory, iter, "p")
        else
          append.appendChild(body.removeChild(iter))
        iter = append.nextSibling
      else
        iter = iter.nextSibling
    else if iter.nodeType == 1
      tag = iter.tagName.toLowerCase()
      if (tag == "br" || blocks.test(tag)) && append != null
          body.insertBefore(append, iter)
          self.normalizers['p'](append)
          append = null
      if tag == "br"
        iter = self.remove(iter)
      else if inlines.test(tag)
        next = (normalizers[tag] || normalizers["@"])(factory, iter, cursor)
        if next is iter
          if append == null
            append = paragraph(iter)
          else
            append.appendChild(body.removeChild(iter))
          iter = append.nextSibling
        else
          iter = next
      else if blocks.test(tag)
        iter = (normalizers[tag] || normalizers['!'])(factory, iter, cursor)
      else
        iter = flatten(iter)
    else
      iter = self.remove(iter)

  if append != null
      normalizers["p"](factory, append, cursor)

  cursor

window.Swimlane ?= Swimlane
