export class HighlightUI {
  constructor() {
    this.bounds = new Map();
  }

  addCursorHandlers(item, cursor) {
    item.onMouseEnter = () => {
      document.body.style.cursor = cursor;
    };

    item.onMouseLeave = () => {
      document.body.style.cursor = "default";
    };
  }

  createControlPoints(bounds) {
    const points = [];
    const positions = [
      { pos: bounds.topLeft, cursor: "nw-resize" },
      { pos: bounds.topCenter, cursor: "n-resize" },
      { pos: bounds.topRight, cursor: "ne-resize" },
      { pos: bounds.leftCenter, cursor: "w-resize" },
      { pos: bounds.rightCenter, cursor: "e-resize" },
      { pos: bounds.bottomLeft, cursor: "sw-resize" },
      { pos: bounds.bottomCenter, cursor: "s-resize" },
      { pos: bounds.bottomRight, cursor: "se-resize" },
    ];

    positions.forEach(({ pos, cursor }) => {
      const point = new paper.Path.Circle({
        center: pos,
        radius: 4,
        fillColor: "white",
        strokeColor: "#005BBB",
        strokeWidth: 1,
        name: "control-point",
        data: { cursor },
      });

      this.addCursorHandlers(point, cursor);
      points.push(point);
    });

    return points;
  }

  clearAll() {
    this.bounds.forEach((elements) => {
      elements.box.remove();
      elements.controls.forEach((point) => point.remove());
    });
    this.bounds.clear();
  }

  show(items) {
    this.clearAll();

    if (items.length === 0) return;

    // 统一计算边界框
    const combinedBounds = items.reduce(
      (acc, item) => acc.unite(item.bounds),
      items[0].bounds.clone()
    );

    // 创建统一的边界框
    const boundingBox = new paper.Path.Rectangle({
      rectangle: combinedBounds,
      strokeColor: "#005BBB",
      strokeWidth: 1,
      dashArray: [4, 4],
      selected: false,
      name: "selection-bounds",
    });

    // 创建控制点
    const controlPoints = this.createControlPoints(combinedBounds);
    controlPoints.forEach((point) => {
      point.data.items = items; // 存储所有相关项目
    });

    this.bounds.set("selection", {
      box: boundingBox,
      controls: controlPoints,
      items: items,
    });
  }

  hide(items) {
    const elements = this.bounds.get("selection");
    if (elements) {
      elements.box.remove();
      elements.controls.forEach((point) => point.remove());
      this.bounds.delete("selection");
    }
  }

  update(items) {
    this.hide(items);
    this.show(items);
  }
}
