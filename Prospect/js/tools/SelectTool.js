export class SelectTool {
  constructor() {
    this.tool = new paper.Tool();
    this.selectedItems = [];
    this.selectionUI = null;
    this.dragRect = null;
    this.dragStart = null;
    this.hitOptions = {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5,
      match: (result) => {
        if (result.item?.data?.isRotationHandle) return true;
        if (result.item?.parent === this.selectionUI) return false;
        return true;
      },
    };
    this.isDraggingSelection = false;
    this.isSelectingBox = false;
    this.isRotating = false;
    this.rotationCenter = null;
    this.initialAngle = null;

    this.initializeEvents();
    this.initializeKeyEvents();
  }

  initializeEvents() {
    this.tool.onMouseDown = (event) => this.onMouseDown(event);
    this.tool.onMouseDrag = (event) => this.onMouseDrag(event);
    this.tool.onMouseUp = (event) => this.onMouseUp(event);
    this.tool.onMouseMove = (event) => this.onMouseMove(event);
  }

  initializeKeyEvents() {
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  onKeyDown(event) {
    if (event.key === "Delete" || event.key === "Backspace") {
      if (this.selectedItems.length > 0) {
        this.deleteSelectedItems();
      }
    }
  }

  deleteSelectedItems() {
    this.selectedItems.forEach((item) => {
      item.remove();
    });
    this.selectedItems = [];
    this.removeSelectionUI();
  }

  // 选择管理相关方法
  clearSelection() {
    this.selectedItems.forEach((item) => (item.selected = false));
    this.selectedItems = [];
    this.removeSelectionUI();
  }

  addToSelection(item) {
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
      item.selected = true;
    }
  }

  removeFromSelection(item) {
    const index = this.selectedItems.indexOf(item);
    if (index !== -1) {
      item.selected = false;
      this.selectedItems.splice(index, 1);
    }
  }

  // UI 相关方法
  createSelectionUI(items) {
    this.removeSelectionUI();

    if (!items?.length) return;

    this.selectionUI = new paper.Group();

    let totalBounds = items[0].bounds.clone();
    items.forEach((item) => {
      if (item?.bounds) {
        totalBounds = totalBounds.unite(item.bounds);
      }
    });

    const selectionRect = new paper.Path.Rectangle({
      rectangle: totalBounds,
      strokeColor: "#4285f4",
      strokeWidth: 1,
      dashArray: [4, 4],
      selected: false,
      fillColor: null,
      name: "selectionRect",
    });

    const rotationHandle = new paper.Path.Circle({
      center: totalBounds.topCenter.add(new paper.Point(0, -40)),
      radius: 12,
      fillColor: "#4285f4",
      strokeColor: "white",
      strokeWidth: 2,
      name: "rotationHandle",
      data: { isRotationHandle: true },
    });

    const rotationLine = new paper.Path.Line({
      from: totalBounds.topCenter,
      to: rotationHandle.position,
      strokeColor: "#4285f4",
      strokeWidth: 1,
      name: "rotationLine",
    });

    this.selectionUI.addChildren([selectionRect, rotationHandle, rotationLine]);
    this.selectionUI.selectedItems = items;
    this.selectionUI.bringToFront();
  }

  removeSelectionUI() {
    if (this.selectionUI) {
      this.selectionUI.remove();
      this.selectionUI = null;
    }
  }

  updateSelectionUI() {
    if (!this.selectedItems.length || !this.selectionUI) return;

    let totalBounds = this.selectedItems[0].bounds.clone();
    this.selectedItems.forEach((item) => {
      if (item?.bounds) {
        totalBounds = totalBounds.unite(item.bounds);
      }
    });

    const selectionRect = this.selectionUI.children.find(
      (child) => child.name === "selectionRect"
    );
    if (selectionRect) {
      selectionRect.bounds = totalBounds;
    }
  }

  // 鼠标事件处理
  onMouseDown(event) {
    this.dragStart = event.point;
    const hitResult = paper.project.hitTest(event.point, this.hitOptions);

    if (hitResult?.item?.data?.isRotationHandle) {
      this.handleHitResult(hitResult, event);
      return;
    }

    const isClickInSelection =
      this.selectionUI?.bounds.contains(event.point) &&
      this.selectedItems.length > 0;

    if (isClickInSelection && !event.modifiers.shift) {
      this.isDraggingSelection = true;
      return;
    }

    if (hitResult) {
      this.handleHitResult(hitResult, event);
    } else {
      this.handleEmptyClick(event);
    }
  }

  handleHitResult(hitResult, event) {
    if (hitResult.item?.data?.isRotationHandle) {
      this.isRotating = true;
      this.isDraggingSelection = false;
      this.rotationCenter = this.getSelectionCenter();
      this.initialAngle = this.getAngle(event.point);
      return;
    }

    if (this.selectionUI?.isAncestor(hitResult.item)) return;

    if (event.modifiers.shift) {
      // 切换选择状态
      if (this.selectedItems.includes(hitResult.item)) {
        this.removeFromSelection(hitResult.item);
      } else {
        this.addToSelection(hitResult.item);
      }
      this.isDraggingSelection = false;
    } else {
      this.clearSelection();
      this.addToSelection(hitResult.item);
      this.isDraggingSelection = true;
    }

    if (this.selectedItems.length > 0) {
      this.createSelectionUI(this.selectedItems);
    }
  }

  handleEmptyClick(event) {
    if (!event.modifiers.shift) {
      this.clearSelection();
    }

    this.isSelectingBox = true;
    this.dragRect = new paper.Path({
      segments: [event.point, event.point, event.point, event.point],
      closed: true,
      strokeColor: "blue",
      strokeWidth: 1,
      dashArray: [5, 5],
      fillColor: new paper.Color(0, 0, 1, 0.1),
      guide: true,
    });
  }

  onMouseDrag(event) {
    if (this.isRotating && this.rotationCenter) {
      const currentAngle = this.getAngle(event.point);
      const rotation = currentAngle - this.initialAngle;

      const originalCenter = this.getSelectionCenter();

      this.selectedItems.forEach((item) => {
        const itemCenter = item.position;
        const offset = itemCenter.subtract(this.rotationCenter);
        offset.angle += rotation;
        item.rotate(rotation, this.rotationCenter);
      });

      this.selectionUI.rotate(rotation, this.rotationCenter);

      this.initialAngle = currentAngle;

      paper.view.update();
      return;
    }

    if (this.isSelectingBox && this.dragRect) {
      this.updateDragRect(event);
    } else if (this.isDraggingSelection && this.selectedItems.length > 0) {
      this.moveSelection(event.delta);
    }
  }

  updateDragRect(event) {
    const topLeft = new paper.Point(
      Math.min(this.dragStart.x, event.point.x),
      Math.min(this.dragStart.y, event.point.y)
    );
    const bottomRight = new paper.Point(
      Math.max(this.dragStart.x, event.point.x),
      Math.max(this.dragStart.y, event.point.y)
    );

    this.dragRect.segments[0].point = topLeft;
    this.dragRect.segments[1].point = new paper.Point(bottomRight.x, topLeft.y);
    this.dragRect.segments[2].point = bottomRight;
    this.dragRect.segments[3].point = new paper.Point(topLeft.x, bottomRight.y);
  }

  moveSelection(delta) {
    this.selectedItems.forEach((item) => {
      item.position = item.position.add(delta);
    });
    if (this.selectionUI) {
      this.selectionUI.position = this.selectionUI.position.add(delta);
    }
    paper.view.update();
  }

  onMouseUp(event) {
    if (this.isRotating) {
      this.isRotating = false;
      this.rotationCenter = null;
      this.initialAngle = null;
      return;
    }

    if (this.isSelectingBox && this.dragRect) {
      this.handleBoxSelection();
    }

    this.isDraggingSelection = false;
    this.dragStart = null;
  }

  handleBoxSelection() {
    const items = paper.project.getItems({
      overlapping: this.dragRect.bounds,
    });

    const actualItems = items.filter(
      (item) =>
        item instanceof paper.Path &&
        item !== this.dragRect &&
        item !== this.selectionUI &&
        !this.selectionUI?.isAncestor(item)
    );

    actualItems.forEach((item) => this.addToSelection(item));

    if (this.selectedItems.length > 0) {
      this.createSelectionUI(this.selectedItems);
    }

    this.dragRect.remove();
    this.dragRect = null;
    this.isSelectingBox = false;
  }

  onMouseMove(event) {
    const hitResult = paper.project.hitTest(event.point, this.hitOptions);
    const isOverRotationHandle = hitResult?.item?.data?.isRotationHandle;

    if (isOverRotationHandle) {
      document.body.style.cursor = "rotate";
      return;
    }

    const shouldShowMoveCursor =
      (this.isDraggingSelection && this.selectedItems.length > 0) ||
      this.selectedItems.some((item) => item.contains(event.point));

    document.body.style.cursor = shouldShowMoveCursor ? "move" : "default";
  }

  activate() {
    this.tool.activate();
    console.log("SelectTool: Activated");
  }

  deactivate() {
    this.clearSelection();
    this.isDraggingSelection = false;
    this.isSelectingBox = false;
    this.dragRect = null;
    this.dragStart = null;
    document.removeEventListener("keydown", this.onKeyDown);
  }

  getSelectionCenter() {
    if (!this.selectedItems.length) return null;
    let bounds = this.selectedItems[0].bounds.clone();
    this.selectedItems.forEach((item) => {
      bounds = bounds.unite(item.bounds);
    });
    return bounds.center;
  }

  getAngle(point) {
    if (!this.rotationCenter) return 0;
    return (
      (Math.atan2(
        point.y - this.rotationCenter.y,
        point.x - this.rotationCenter.x
      ) *
        180) /
      Math.PI
    );
  }
}
