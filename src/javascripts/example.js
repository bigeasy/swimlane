$(function () {
  swimlane = new Swimlane($("#editable"))
  $("#toggle").click(swimlane.toggle.bind(swimlane));
});
