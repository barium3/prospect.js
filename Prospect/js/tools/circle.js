var currentPath = null;
var startPoint = null;

function onMouseDown(event) {
  startPoint = event.point;
  currentPath = new Path.Circle({
    center: startPoint,
    radius: 1,
    strokeColor: "black",
    strokeWidth: 2,
    fillColor: "white",
  });
}

function onMouseDrag(event) {
  if (currentPath) {
    var radius = event.point.subtract(startPoint).length;
    currentPath.remove();
    currentPath = new Path.Circle({
      center: startPoint,
      radius: radius,
      strokeColor: "black",
      strokeWidth: 2,
      fillColor: "white",
    });
  }
}

function onMouseUp(event) {
  if (currentPath) {
    var finalRadius = event.point.subtract(startPoint).length;
    if (finalRadius < 5) {
      currentPath.remove();
    }
    currentPath = null;
  }
}
