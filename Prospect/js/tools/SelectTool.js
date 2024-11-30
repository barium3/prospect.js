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
    };
    this.isDraggingSelection = false;
    this.isSelectingBox = false;
    this.selectedSegments = [];
    this.segmentMode = false;

    this.initializeEvents();
  }

  initializeEvents() {
    this.tool.onMouseDown = (event) => this.onMouseDown(event);
    this.tool.onMouseDrag = (event) => this.onMouseDrag(event);
    this.tool.onMouseUp = (event) => this.onMouseUp(event);
    this.tool.onMouseMove = (event) => this.onMouseMove(event);
  }

  createSelectionUI(items, segments = null) {
    this.removeSelectionUI();

    // 创建一个组来包含所有UI元素
    this.selectionUI = new paper.Group();

    if (segments && segments.length > 0) {
      // 为选中的锚点创建高亮框

      // 计算选中锚点的边界
      let minX = segments[0].point.x;
      let minY = segments[0].point.y;
      let maxX = segments[0].point.x;
      let maxY = segments[0].point.y;

      segments.forEach((segment) => {
        minX = Math.min(minX, segment.point.x);
        minY = Math.min(minY, segment.point.y);
        maxX = Math.max(maxX, segment.point.x);
        maxY = Math.max(maxY, segment.point.y);
      });

      // 创建一个矩形选择框
      const selectionRect = new paper.Path.Rectangle({
        from: new paper.Point(minX - 4, minY - 4),
        to: new paper.Point(maxX + 4, maxY + 4),
        strokeColor: "#4285f4",
        strokeWidth: 1,
        dashArray: [4, 4],
        selected: false,
        fillColor: null,
        name: "selectionRect",
      });
      this.selectionUI.addChild(selectionRect);

      // 为每个选中的锚点创建一个小方块
      segments.forEach((segment) => {
        const segmentSquare = new paper.Path.Rectangle({
          center: segment.point,
          size: [8, 8],
          strokeColor: "#4285f4",
          fillColor: "#fff",
          strokeWidth: 1,
          name: "segmentSquare",
        });
        this.selectionUI.addChild(segmentSquare);
      });
    } else if (items && items.length > 0) {
      // 原有的对象选择框逻辑
      let totalBounds = items[0].bounds.clone();
      items.forEach((item) => {
        if (item && item.bounds) {
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

      this.selectionUI.addChild(selectionRect);
    }

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
    if (this.segmentMode && this.selectedSegments.length > 0) {
      // 更新锚点选择框
      this.createSelectionUI(null, this.selectedSegments);
    } else if (this.selectedItems.length > 0 && this.selectionUI) {
      // 更新对象选择框
      let totalBounds = this.selectedItems[0].bounds.clone();
      this.selectedItems.forEach((item) => {
        if (item && item.bounds) {
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
  }

  onMouseDown(event) {
    console.log("onMouseDown called with point:", event.point);
    this.dragStart = event.point;
    const isCommandKey = event.modifiers.command || event.modifiers.control;

    const hitResult = paper.project.hitTest(event.point, this.hitOptions);

    // 首先检查是否点击在选择框内
    const isClickInSelection =
      this.selectionUI &&
      this.selectionUI.bounds.contains(event.point) &&
      (this.selectedItems.length > 0 || this.selectedSegments.length > 0);

    if (isClickInSelection) {
      console.log("Clicked inside selection UI");
      this.isDraggingSelection = true;
      return;
    }

    if (hitResult) {
      // 如果点击的是UI元素的一部分，忽略它
      if (this.selectionUI && this.selectionUI.isAncestor(hitResult.item)) {
        console.log("Clicked on selection UI element");
        return;
      }

      if (!event.modifiers.shift) {
        // 清除之前的所有选择（包括对象和锚点）
        this.selectedItems.forEach((item) => (item.selected = false));
        this.selectedItems = [];
        this.selectedSegments.forEach((segment) => (segment.selected = false));
        this.selectedSegments = [];
        this.removeSelectionUI();
      }

      // 根据是否按下cmd键决定选择锚点还是整个对象
      if (isCommandKey && hitResult.type === "segment") {
        // 选择锚点
        hitResult.segment.selected = true;
        if (!this.selectedSegments.includes(hitResult.segment)) {
          this.selectedSegments.push(hitResult.segment);
        }
        this.segmentMode = true;
        this.createSelectionUI(null, this.selectedSegments);
      } else {
        // 选择整个对象
        if (!this.selectedItems.includes(hitResult.item)) {
          this.selectedItems.push(hitResult.item);
          hitResult.item.selected = true;
        }
        this.createSelectionUI(this.selectedItems);
        this.segmentMode = false;
      }
      this.isDraggingSelection = true;
    } else {
      // 点击空白处，开始框选
      if (!event.modifiers.shift) {
        // 清除所有选择
        this.selectedItems.forEach((item) => (item.selected = false));
        this.selectedItems = [];
        this.selectedSegments.forEach((segment) => (segment.selected = false));
        this.selectedSegments = [];
        this.removeSelectionUI();
      }

      this.isSelectingBox = true;
      this.isSegmentSelectionMode = isCommandKey; // 记录是否是锚点选择模式

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
  }

  onMouseDrag(event) {
    if (this.isSelectingBox && this.dragRect) {
      // 更新框选区域
      const topLeft = new paper.Point(
        Math.min(this.dragStart.x, event.point.x),
        Math.min(this.dragStart.y, event.point.y)
      );
      const bottomRight = new paper.Point(
        Math.max(this.dragStart.x, event.point.x),
        Math.max(this.dragStart.y, event.point.y)
      );

      this.dragRect.segments[0].point = topLeft;
      this.dragRect.segments[1].point = new paper.Point(
        bottomRight.x,
        topLeft.y
      );
      this.dragRect.segments[2].point = bottomRight;
      this.dragRect.segments[3].point = new paper.Point(
        topLeft.x,
        bottomRight.y
      );
      return;
    }

    // 处理拖动（对象或锚点）
    if (this.isDraggingSelection) {
      if (this.segmentMode && this.selectedSegments.length > 0) {
        // 移动选中的锚点
        this.selectedSegments.forEach((segment) => {
          segment.point = segment.point.add(event.delta);
        });
        // 更新锚点选择框
        this.updateSelectionUI();
      } else if (this.selectedItems.length > 0) {
        // 移动选中的对象
        this.selectedItems.forEach((item) => {
          item.position = item.position.add(event.delta);
        });
        // 更新对象选择框的位置
        if (this.selectionUI) {
          this.selectionUI.position = this.selectionUI.position.add(
            event.delta
          );
        }
      }
      paper.view.update();
    }
  }

  onMouseUp(event) {
    if (this.isSelectingBox && this.dragRect) {
      const isCommandKey = event.modifiers.command || event.modifiers.control;

      if (isCommandKey) {
        // CMD框选：选择锚点
        paper.project.activeLayer.children.forEach((item) => {
          if (item.segments) {
            item.segments.forEach((segment) => {
              if (this.dragRect.bounds.contains(segment.point)) {
                segment.selected = true;
                if (!this.selectedSegments.includes(segment)) {
                  this.selectedSegments.push(segment);
                }
              }
            });
          }
        });

        if (this.selectedSegments.length > 0) {
          this.segmentMode = true;
          this.createSelectionUI(null, this.selectedSegments);
        }
      } else {
        // 普通框选：选择整个对象
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

        actualItems.forEach((item) => {
          if (!this.selectedItems.includes(item)) {
            this.selectedItems.push(item);
            item.selected = true;
          }
        });

        if (this.selectedItems.length > 0) {
          this.segmentMode = false;
          this.createSelectionUI(this.selectedItems);
        }
      }

      this.dragRect.remove();
      this.dragRect = null;
      this.isSelectingBox = false;
    }

    this.isDraggingSelection = false;
    this.dragStart = null;
  }

  onMouseMove(event) {
    if (this.isDraggingSelection && this.selectedItems.length > 0) {
      document.body.style.cursor = "move";
    } else {
      // 如果鼠标在任何选中对象上方，显示移动光标
      const isOverSelected = this.selectedItems.some((item) =>
        item.contains(event.point)
      );
      document.body.style.cursor = isOverSelected ? "move" : "default";
    }
  }

  activate() {
    this.tool.activate();
    console.log("SelectTool: Activated");
  }

  deactivate() {
    // 清除所有选中状态
    if (this.selectedItems) {
      this.selectedItems.forEach((item) => {
        if (item) {
          item.selected = false;
        }
      });
      this.selectedItems = [];
    }

    // 清除选中的锚点
    if (this.selectedSegments) {
      this.selectedSegments.forEach((segment) => {
        if (segment) {
          segment.selected = false;
        }
      });
      this.selectedSegments = [];
    }

    // 移除选择框UI
    this.removeSelectionUI();

    // 重置所有状态
    this.isDraggingSelection = false;
    this.isSelectingBox = false;
    this.dragRect = null;
    this.dragStart = null;
    this.segmentMode = false;
    this.selectedSegment = null;
  }
}
