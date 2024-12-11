import { HighlightUI } from "./ui/highlightUI.js";

export class SelectTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.highlightUI = new HighlightUI();
    this.selectedItems = [];
    this.dragStartPoint = null;
    this.isDragging = false;
    this.currentAction = null; // 'move', 'scale', 'rotate'
    this.originalBounds = null;
    this.originalStates = new Map(); // 存储操作开始时的状态
    this.hasActuallyMoved = false; // 标记实际发生了移动

    this.canvas.setSelectTool(this);
  }

  handleMouseDown(event) {
    // 首先检查是否点击了控制点
    const controlPoint = paper.project.hitTest(event.point, {
      segments: true,
      tolerance: 5,
      match: (result) => result.item.name === "control-point",
    });

    if (controlPoint) {
      this.currentAction = "scale";
      this.dragStartPoint = event.point;
      this.saveOriginalStates();
      return;
    }

    // 检查是否点击了已选中的对象或选择框
    const hitResult = paper.project.hitTest(event.point, {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 5,
      match: (result) => {
        const item = result.item;
        // 如果点击的是选择框或其控制点，返回true
        if (item.name?.startsWith("selection-")) {
          return true;
        }
        // 如果点击的是已选中的对象，返回true
        return this.selectedItems.includes(item);
      },
    });

    if (hitResult) {
      // 如果点击了已选中的对象或选择框
      if (
        event.modifiers.shift &&
        this.selectedItems.includes(hitResult.item)
      ) {
        // 如果按住shift并点击已选中的对象，则取消选择该对象
        this.removeFromSelection(hitResult.item);
        if (this.selectedItems.length > 0) {
          this.highlightUI.update(this.selectedItems);
        }
        return;
      }

      // 其他情况保持原有的移动逻辑
      this.currentAction = "move";
      this.dragStartPoint = event.point;
      this.isDragging = true;
      this.saveOriginalStates();
    } else {
      // 点击了其他区域
      const newItemHit = paper.project.hitTest(event.point, {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5,
        match: (result) => !result.item.name?.startsWith("selection-"),
      });

      if (newItemHit) {
        // 点击了新对象，仅更新选择状态，不记录操作
        if (!event.modifiers.shift) {
          this.clearSelection();
        }
        this.selectItem(newItemHit.item);
        this.currentAction = "move";
        this.dragStartPoint = event.point;
        this.isDragging = true;
        this.saveOriginalStates();
      } else {
        // 点击空白区域，清除选择
        if (!event.modifiers.shift) {
          this.clearSelection();
        }
      }
    }
  }

  saveOriginalStates() {
    this.originalStates.clear();
    this.selectedItems.forEach((item) => {
      this.originalStates.set(
        item.data.id,
        item.exportJSON({ asString: false })
      );
    });
  }

  handleMouseDrag(event) {
    if (!this.dragStartPoint) return;

    const delta = event.point.subtract(this.dragStartPoint);
    if (delta.length > 0) {
      this.hasActuallyMoved = true; // 标记实际发生了移动
    }

    const items = this.selectedItems;

    switch (this.currentAction) {
      case "move": {
        // 统一移动逻辑
        const moveCenter = items
          .reduce((acc, item) => acc.add(item.position), new paper.Point(0, 0))
          .divide(items.length);

        items.forEach((item) => {
          item.position = item.position.add(delta);
        });
        break;
      }

      case "scale": {
        // 统一缩放逻辑
        const bounds = items.reduce(
          (acc, item) => acc.unite(item.bounds),
          items[0].bounds.clone()
        );
        const scaleCenter = bounds.center;
        const scale =
          event.point.subtract(scaleCenter).length /
          this.dragStartPoint.subtract(scaleCenter).length;

        items.forEach((item) => {
          item.scale(scale, scaleCenter);
        });
        break;
      }
    }

    this.dragStartPoint = event.point;
    this.highlightUI.update(this.selectedItems);
  }

  handleMouseUp(event) {
    if (this.isDragging || this.currentAction === "scale") {
      if (this.hasActuallyMoved) {
        // 只有在实际发生移动或缩放时才记录操作
        const modifications = this.selectedItems.map((item) => ({
          id: item.data.id,
          oldState: this.originalStates.get(item.data.id),
          newState: item.exportJSON({ asString: false }),
        }));

        this.canvas.saveOperation({
          type: "modify",
          modifications: modifications,
        });
      }
    }

    this.isDragging = false;
    this.dragStartPoint = null;
    this.currentAction = null;
    this.originalBounds = null;
    this.originalStates.clear();
    this.hasActuallyMoved = false; // 重置移动标志
  }

  selectItem(item) {
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
      this.highlightUI.show(this.selectedItems);
    }
  }

  clearSelection() {
    if (this.selectedItems.length > 0) {
      this.highlightUI.hide(this.selectedItems);
      this.selectedItems = [];
    }
  }

  removeFromSelection(item) {
    const index = this.selectedItems.indexOf(item);
    if (index !== -1) {
      this.highlightUI.hide(item);
      this.selectedItems.splice(index, 1);
    }
  }

  updateSelectionUI() {
    this.highlightUI.update(this.selectedItems);
  }
}
