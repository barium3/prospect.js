var currentPath = null;
var startPoint = null;

function onMouseDown(event) {
  startPoint = event.point;
  currentPath = new Path.Rectangle({
    from: event.point,
    to: event.point,
    strokeColor: "black",
    strokeWidth: 2,
    fillColor: "white",
  });
}

function onMouseDrag(event) {
  if (currentPath) {
    currentPath.remove();
    currentPath = new Path.Rectangle({
      from: startPoint,
      to: event.point,
      strokeColor: "black",
      strokeWidth: 2,
      fillColor: "white",
    });
  }
}

function onMouseUp(event) {
  if (currentPath) {
    var size = event.point.subtract(startPoint);
    if (Math.abs(size.x) < 5 || Math.abs(size.y) < 5) {
      currentPath.remove();
    }
    currentPath = null;
  }
}
