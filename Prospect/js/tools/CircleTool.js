export class CircleTool {
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
    console.log("CircleTool: Mouse Down at", event.point);
    this.isDrawing = true;
    this.startPoint = event.point;

    this.currentPath = new paper.Path.Circle({
      center: this.startPoint,
      radius: 1,
      strokeColor: "black",
      strokeWidth: 2,
      fillColor: "white",
    });
    console.log("CircleTool: Circle created with initial radius 1");
  }

  onMouseDrag(event) {
    if (this.isDrawing && this.currentPath) {
      const radius = event.point.subtract(this.startPoint).length;
      this.currentPath.remove();
      this.currentPath = new paper.Path.Circle({
        center: this.startPoint,
        radius: radius,
        strokeColor: "black",
        strokeWidth: 2,
        fillColor: "white",
      });
      console.log(`CircleTool: Mouse Drag to radius ${radius}`);
      paper.view.update();
    }
  }

  onMouseUp(event) {
    if (this.isDrawing && this.currentPath) {
      const finalRadius = event.point.subtract(this.startPoint).length;
      console.log(`CircleTool: Mouse Up with final radius ${finalRadius}`);
      this.isDrawing = false;

      if (finalRadius < 5) {
        console.log("CircleTool: Final radius is too small. Removing circle.");
        this.currentPath.remove();
        this.currentPath = null;
      } else {
        console.log("CircleTool: Circle finalized.");
      }
    }
  }

  activate() {
    this.tool.activate();
    console.log("CircleTool: Activated");
  }
}
