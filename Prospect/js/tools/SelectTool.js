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
        if (result.item?.data?.isScaleHandle) return true;
        if (result.item?.parent === this.selectionUI) return false;
        return true;
      },
    };
    this.isDraggingSelection = false;
    this.isSelectingBox = false;
    this.isRotating = false;
    this.rotationCenter = null;
    this.initialAngle = null;
    this.isScaling = false;
    this.scaleHandle = null;
    this.initialBounds = null;
    this.initialPoint = null;
    this.initialRatio = null;
    this.scaleCenter = null;
    this.dragStartPositions = null;
    this.axisLines = null;
    this.activeAxis = null;

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
      return;
    }

    if (this.selectedItems.length > 0) {
      const moveDistance = event.shiftKey ? 100 : 10;
      let delta = new paper.Point(0, 0);

      switch (event.key) {
        case "ArrowLeft":
          delta.x = -moveDistance;
          break;
        case "ArrowRight":
          delta.x = moveDistance;
          break;
        case "ArrowUp":
          delta.y = -moveDistance;
          break;
        case "ArrowDown":
          delta.y = moveDistance;
          break;
        default:
          return;
      }

      event.preventDefault();

      this.moveSelection(delta);
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

    const scaleHandles = this.createScaleHandles(totalBounds);

    this.selectionUI.addChildren([
      selectionRect,
      rotationHandle,
      rotationLine,
      ...scaleHandles,
    ]);
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

    if (
      hitResult?.item?.data?.isRotationHandle ||
      hitResult?.item?.data?.isScaleHandle
    ) {
      this.handleHitResult(hitResult, event);
      return;
    }

    const isClickInSelection =
      this.selectionUI?.bounds.contains(event.point) &&
      this.selectedItems.length > 0;

    if (isClickInSelection) {
      this.isDraggingSelection = true;
      this.dragStartPositions = this.selectedItems.map((item) => ({
        item: item,
        position: item.position.clone(),
      }));
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
      this.rotationCenter = this.getSelectionCenter();
      this.initialAngle = this.getAngle(event.point);
      return;
    }

    if (hitResult.item?.data?.isScaleHandle) {
      this.isScaling = true;
      this.scaleHandle = hitResult.item;
      this.initialBounds = this.getSelectionBounds().clone();
      this.initialPoint = event.point;
      this.initialRatio = this.initialBounds.width / this.initialBounds.height;
      this.scaleCenter = this.getSelectionCenter();
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
    if (this.isScaling && this.scaleHandle) {
      this.handleScaling(event);
      return;
    }

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
      if (!this.dragStartPositions) {
        this.dragStartPositions = this.selectedItems.map((item) => ({
          item: item,
          position: item.position.clone(),
        }));
      }

      if (event.modifiers.shift) {
        if (!this.axisLines && this.dragStartPositions.length > 0) {
          this.createAxisLines(this.dragStartPositions[0].position);
        }
        this.handleAxisConstrainedMove(event);
      } else {
        this.moveSelection(event.delta);
        this.removeAxisLines();
      }
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

    if (this.isScaling) {
      this.isScaling = false;
      this.scaleHandle = null;
      this.initialBounds = null;
      this.initialPoint = null;
      this.initialRatio = null;
      this.scaleCenter = null;
    }

    if (this.isSelectingBox && this.dragRect) {
      this.handleBoxSelection();
    }

    this.isDraggingSelection = false;
    this.dragStartPositions = null;
    this.removeAxisLines();
    this.activeAxis = null;
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

    if (hitResult?.item?.data?.isScaleHandle) {
      document.body.style.cursor = hitResult.item.data.cursor;
      return;
    }

    if (hitResult?.item?.data?.isRotationHandle) {
      document.body.style.cursor = "rotate";
      return;
    }

    document.body.style.cursor = "default";
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

  createScaleHandles(bounds) {
    const handleSize = 8;
    const handles = [];
    const positions = [
      { point: bounds.topLeft, cursor: "nw-resize", name: "topLeft" },
      { point: bounds.topCenter, cursor: "n-resize", name: "topCenter" },
      { point: bounds.topRight, cursor: "ne-resize", name: "topRight" },
      { point: bounds.rightCenter, cursor: "e-resize", name: "rightCenter" },
      { point: bounds.bottomRight, cursor: "se-resize", name: "bottomRight" },
      { point: bounds.bottomCenter, cursor: "s-resize", name: "bottomCenter" },
      { point: bounds.bottomLeft, cursor: "sw-resize", name: "bottomLeft" },
      { point: bounds.leftCenter, cursor: "w-resize", name: "leftCenter" },
    ];

    positions.forEach(({ point, cursor, name }) => {
      const handle = new paper.Path.Rectangle({
        center: point,
        size: [handleSize, handleSize],
        fillColor: "white",
        strokeColor: "#4285f4",
        strokeWidth: 1,
        name: `scaleHandle_${name}`,
        data: {
          isScaleHandle: true,
          cursor: cursor,
          handlePosition: name,
        },
      });
      handles.push(handle);
    });

    return handles;
  }

  handleScaling(event) {
    let position = this.scaleHandle.data.handlePosition;
    const keepAspectRatio = event.modifiers.shift;
    const fromCenter = event.modifiers.alt;
    const fixedPoint = fromCenter
      ? this.scaleCenter
      : this.getFixedPoint(position);
    const movingPoint = event.point;

    // 检查是否需要切换手柄位置
    if (!fromCenter) {
      const switchPosition = this.shouldSwitchHandle(
        position,
        fixedPoint,
        movingPoint
      );
      if (switchPosition) {
        position = switchPosition;
      }
    }

    // 计算选区的整体bounds
    const selectionBounds = this.getSelectionBounds();

    // 记录每个item相对于选区bounds的相对位置和大小
    const itemsInfo = this.selectedItems.map((item) => ({
      item,
      relativeX: (item.bounds.x - selectionBounds.x) / selectionBounds.width,
      relativeY: (item.bounds.y - selectionBounds.y) / selectionBounds.height,
      relativeWidth: item.bounds.width / selectionBounds.width,
      relativeHeight: item.bounds.height / selectionBounds.height,
    }));

    // 计算选区的新bounds
    const newBounds = this.calculateNewBounds(
      selectionBounds,
      fixedPoint,
      movingPoint,
      position,
      keepAspectRatio,
      fromCenter
    );

    // 根据相对位置更新每个item的bounds
    itemsInfo.forEach(
      ({ item, relativeX, relativeY, relativeWidth, relativeHeight }) => {
        item.bounds = new paper.Rectangle(
          newBounds.x + relativeX * newBounds.width,
          newBounds.y + relativeY * newBounds.height,
          relativeWidth * newBounds.width,
          relativeHeight * newBounds.height
        );
      }
    );

    this.createSelectionUI(this.selectedItems);
  }

  calculateNewBounds(
    bounds,
    fixedPoint,
    movingPoint,
    position,
    keepAspectRatio,
    fromCenter
  ) {
    // 设置最小尺寸限制（可以根据需要调整）
    const MIN_SIZE = 1;

    if (position.includes("Center")) {
      // 中点缩放：保持对面中点不变
      if (["leftCenter", "rightCenter"].includes(position)) {
        let width = fromCenter
          ? Math.abs(movingPoint.x - fixedPoint.x) * 2
          : Math.abs(movingPoint.x - fixedPoint.x);
        // 应用最小宽度限制
        width = Math.max(width, MIN_SIZE);

        let height = keepAspectRatio
          ? width / this.initialRatio
          : bounds.height;
        // 应用最小高度限制
        height = Math.max(height, MIN_SIZE);

        return new paper.Rectangle(
          fromCenter
            ? fixedPoint.x - width / 2
            : position === "leftCenter"
            ? fixedPoint.x - width
            : fixedPoint.x,
          fromCenter ? fixedPoint.y - height / 2 : bounds.y,
          width,
          height
        );
      } else {
        let height = fromCenter
          ? Math.abs(movingPoint.y - fixedPoint.y) * 2
          : Math.abs(movingPoint.y - fixedPoint.y);
        // 应用最小高度限制
        height = Math.max(height, MIN_SIZE);

        let width = keepAspectRatio ? height * this.initialRatio : bounds.width;
        // 应用最小宽度限制
        width = Math.max(width, MIN_SIZE);

        return new paper.Rectangle(
          fromCenter ? fixedPoint.x - width / 2 : bounds.x,
          fromCenter
            ? fixedPoint.y - height / 2
            : position === "topCenter"
            ? fixedPoint.y - height
            : fixedPoint.y,
          width,
          height
        );
      }
    } else {
      // 角点缩放：保持对角点不变
      let width = Math.abs(movingPoint.x - fixedPoint.x);
      let height = Math.abs(movingPoint.y - fixedPoint.y);

      // 应用最小尺寸限制
      width = Math.max(width, MIN_SIZE);
      height = Math.max(height, MIN_SIZE);

      if (keepAspectRatio) {
        const currentRatio = width / height;
        if (currentRatio > this.initialRatio) {
          width = height * this.initialRatio;
        } else {
          height = width / this.initialRatio;
        }
        // 再次确保最小尺寸限制
        width = Math.max(width, MIN_SIZE);
        height = Math.max(height, MIN_SIZE);
      }

      if (fromCenter) {
        width *= 2;
        height *= 2;
      }

      return new paper.Rectangle(
        fromCenter
          ? fixedPoint.x - width / 2
          : position.includes("Left")
          ? fixedPoint.x - width
          : fixedPoint.x,
        fromCenter
          ? fixedPoint.y - height / 2
          : position.includes("top")
          ? fixedPoint.y - height
          : fixedPoint.y,
        width,
        height
      );
    }
  }

  getFixedPoint(position) {
    const bounds = this.initialBounds;

    switch (position) {
      case "topLeft":
        return bounds.bottomRight;
      case "topRight":
        return bounds.bottomLeft;
      case "bottomRight":
        return bounds.topLeft;
      case "bottomLeft":
        return bounds.topRight;
      case "topCenter":
        return bounds.bottomCenter;
      case "rightCenter":
        return bounds.leftCenter;
      case "bottomCenter":
        return bounds.topCenter;
      case "leftCenter":
        return bounds.rightCenter;
      default:
        return bounds.center;
    }
  }

  getSelectionBounds() {
    if (!this.selectedItems.length) return null;
    let bounds = this.selectedItems[0].bounds.clone();
    this.selectedItems.forEach((item) => {
      bounds = bounds.unite(item.bounds);
    });
    return bounds;
  }

  // 添加新方法
  shouldSwitchHandle(position, fixedPoint, movingPoint) {
    // 计算鼠标相对于固定点的位置
    const isRight = movingPoint.x > fixedPoint.x;
    const isLeft = movingPoint.x < fixedPoint.x;
    const isBottom = movingPoint.y > fixedPoint.y;
    const isTop = movingPoint.y < fixedPoint.y;

    // 角点的处理
    if (position === "topLeft") {
      if (isRight && isBottom) return "bottomRight";
      if (isRight && isTop) return "topRight";
      if (isLeft && isBottom) return "bottomLeft";
    }
    if (position === "topRight") {
      if (isLeft && isBottom) return "bottomLeft";
      if (isLeft && isTop) return "topLeft";
      if (isRight && isBottom) return "bottomRight";
    }
    if (position === "bottomRight") {
      if (isLeft && isTop) return "topLeft";
      if (isLeft && isBottom) return "bottomLeft";
      if (isRight && isTop) return "topRight";
    }
    if (position === "bottomLeft") {
      if (isRight && isTop) return "topRight";
      if (isRight && isBottom) return "bottomRight";
      if (isLeft && isTop) return "topLeft";
    }

    // 中点手柄的处理
    if (position === "leftCenter") {
      if (isRight) return "rightCenter";
    }
    if (position === "rightCenter") {
      if (isLeft) return "leftCenter";
    }
    if (position === "topCenter") {
      if (isBottom) return "bottomCenter";
    }
    if (position === "bottomCenter") {
      if (isTop) return "topCenter";
    }

    return null;
  }

  handleAxisConstrainedMove(event) {
    if (!this.dragStartPositions || this.dragStartPositions.length === 0)
      return;

    const mousePoint = event.point;
    // 计算所有选中对象的中心点作为起始参考点
    const selectionCenter = this.getSelectionCenter();
    const startPoint = this.dragStart;

    const distToVertical = Math.abs(mousePoint.x - startPoint.x);
    const distToHorizontal = Math.abs(mousePoint.y - startPoint.y);

    this.activeAxis = distToVertical < distToHorizontal ? "y" : "x";

    // 计算移动的增量
    const delta = new paper.Point(0, 0);
    if (this.activeAxis === "x") {
      delta.x = mousePoint.x - startPoint.x; // 水平移动
    } else {
      delta.y = mousePoint.y - startPoint.y; // 垂直移动
    }

    // 移动所有选中的项
    this.dragStartPositions.forEach(({ item, position }) => {
      item.position = position.add(delta);
    });

    // 重新创建选择框
    this.createSelectionUI(this.selectedItems);

    // 更新参考线位置
    if (this.axisLines) {
      const viewSize = paper.view.size;
      const verticalLine = this.axisLines.children.find(
        (c) => c.name === "verticalAxis"
      );
      const horizontalLine = this.axisLines.children.find(
        (c) => c.name === "horizontalAxis"
      );

      if (verticalLine) {
        verticalLine.segments[0].point.x = selectionCenter.x;
        verticalLine.segments[1].point.x = selectionCenter.x;
      }
      if (horizontalLine) {
        horizontalLine.segments[0].point.y = selectionCenter.y;
        horizontalLine.segments[1].point.y = selectionCenter.y;
      }
    }

    this.highlightActiveAxis();
    paper.view.update();
  }

  createAxisLines(startPoint) {
    this.removeAxisLines();

    // 使用选区中心点而不是起始点
    const selectionCenter = this.getSelectionCenter();
    this.axisLines = new paper.Group();

    const viewSize = paper.view.size;

    const verticalLine = new paper.Path.Line({
      from: new paper.Point(selectionCenter.x, 0),
      to: new paper.Point(selectionCenter.x, viewSize.height),
      strokeColor: "#4285f4",
      strokeWidth: 1,
      dashArray: [4, 4],
      opacity: 0.5,
      name: "verticalAxis",
    });

    const horizontalLine = new paper.Path.Line({
      from: new paper.Point(0, selectionCenter.y),
      to: new paper.Point(viewSize.width, selectionCenter.y),
      strokeColor: "#4285f4",
      strokeWidth: 1,
      dashArray: [4, 4],
      opacity: 0.5,
      name: "horizontalAxis",
    });

    this.axisLines.addChildren([verticalLine, horizontalLine]);
  }

  highlightActiveAxis() {
    if (!this.axisLines) return;

    const verticalLine = this.axisLines.children.find(
      (c) => c.name === "verticalAxis"
    );
    const horizontalLine = this.axisLines.children.find(
      (c) => c.name === "horizontalAxis"
    );

    if (this.activeAxis === "y") {
      // 修改这里：当activeAxis为y时高亮垂直线
      verticalLine.opacity = 0.8;
      horizontalLine.opacity = 0.2;
    } else {
      // 当activeAxis为x时高亮水平线
      verticalLine.opacity = 0.2;
      horizontalLine.opacity = 0.8;
    }
  }

  removeAxisLines() {
    if (this.axisLines) {
      this.axisLines.remove();
      this.axisLines = null;
    }
  }
}
