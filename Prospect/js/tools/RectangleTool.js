export class RectangleTool {
  constructor() {
    this.currentPath = null;
    this.isDrawing = false;
    this.startPoint = null;
    this.tool = new paper.Tool();

    this.initializeEvents();
  }

  initializeEvents() {
    this.tool.onMouseDown = (event) => this.onMouseDown(event);
    this.tool.onMouseDrag = (event) => this.onMouseDrag(event);
    this.tool.onMouseUp = (event) => this.onMouseUp(event);
  }

  onMouseDown(event) {
    console.log("RectangleTool: Mouse Down at", event.point);
    this.isDrawing = true;
    this.startPoint = event.point;
    this.currentPath = new paper.Path.Rectangle({
      from: event.point,
      to: event.point,
      strokeColor: "black",
      strokeWidth: 2,
      fillColor: "white",
    });
    console.log("RectangleTool: Rectangle created with initial size 0");
  }

  onMouseDrag(event) {
    if (this.isDrawing && this.currentPath) {
      this.currentPath.remove();
      this.currentPath = new paper.Path.Rectangle({
        from: this.startPoint,
        to: event.point,
        strokeColor: "black",
        strokeWidth: 2,
        fillColor: "white",
      });
      console.log(`RectangleTool: Mouse Drag to to point ${event.point}`);
      paper.view.update();
    }
  }

  onMouseUp(event) {
    if (this.isDrawing) {
      console.log(`RectangleTool: Mouse Up at to point ${event.point}`);
      this.isDrawing = false;
    }
  }

  activate() {
    this.tool.activate();
    console.log("RectangleTool: Activated");
  }
}
