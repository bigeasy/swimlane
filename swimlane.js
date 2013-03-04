! function (definition) {
  if (typeof define == 'function') define(defintion);
  else this.Swimlane = definition();
} (function () {
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
  alert(MutationObserver); 
  var slice = objectify.call.bind([].slice);
  function objectify (target) {
    slice(arguments, 1).forEach(function (property) {
      target[property.name] = property;
    });
    return target;
  }
  function keydown (event) {
    console.log('keydown', event); 
  }
  /*
  function textChange (event) {
    console.log('textChange', event); 
  }
  function textChange (event) {
    console.log('textChange', event); 
  }
  */
  function Swimlane (element) {
    function toggle () {
      element.setAttribute('contentEditable', element.getAttribute('contentEditable') ? 'false' : 'true');
      if (element.getAttribute('contentEditable')) {
        element.addEventListener('keydown', keydown);  
   //     element.addEventListener('DOMCharacterDataModified', textChange);  
      } else {

      }
    }
    function destroy () {
    }
    objectify(this, toggle, destroy);
  }
  return Swimlane;
});
