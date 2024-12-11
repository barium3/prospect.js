export class CustomCanvas {
  constructor(canvasId) {
    // 初始化 Paper.js
    this.canvas = document.getElementById(canvasId);
    paper.setup(this.canvas);

    // 状态管理
    this.operations = []; // 存储每个绘制操作
    this.currentIndex = -1; // 当前操作索引

    this.nextId = 1; // 添加一个计数器用于生成唯一ID

    // 当前工具
    this.currentTool = null;

    // 初始化事件监听
    this.initializeEvents();

    this.tools = new Map();

    this.selectTool = null; // 添加选择工具引用
  }

  initializeEvents() {
    // 监听画布变化
    paper.project.view.on("mouseup", (event) => {
      // 获取最后创建的对象
      const layer = paper.project.activeLayer;
      if (layer.children.length > 0) {
        const lastItem = layer.lastChild;

        // Assign a unique id if not already set
        if (!lastItem.data.id) {
          lastItem.data.id = this.nextId++;
        }

        // 检查是否是新创建的对象（通过比较时间戳或其他方式）
        if (
          lastItem &&
          !this.operations.find((op) => op.id === lastItem.data.id) &&
          !lastItem.name?.startsWith("selection-") &&
          !lastItem.name?.startsWith("control-point")
        ) {
          this.saveOperation({
            type: "create",
            objectData: lastItem.exportJSON({ asString: false }),
            id: lastItem.data.id,
          });
        }
      }
    });

    // 监听快捷键
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
      }
    });
  }

  // 保存单个操作
  saveOperation(operation) {
    console.log(`Saving operation: ${operation.type}, ID: ${operation.id}`);

    // 如果在操作历史中间进行了新操作，清除后面的历史
    if (this.currentIndex < this.operations.length - 1) {
      this.operations = this.operations.slice(0, this.currentIndex + 1);
    }

    // 统一处理修改操作
    if (operation.type === "modify") {
      this.operations.push({
        type: "modify",
        modifications: operation.modifications,
        timestamp: Date.now(),
      });
    } else {
      this.operations.push({
        type: operation.type,
        objectData: operation.objectData,
        id: operation.id,
        timestamp: Date.now(),
      });
    }

    this.currentIndex++;
    console.log(`Operation saved. Current index is now: ${this.currentIndex}`);
  }

  // 撤销单个操作
  undo() {
    if (this.currentIndex < 0) return;

    console.log(
      `Undoing operation: ${this.operations[this.currentIndex].type}`
    );
    const operation = this.operations[this.currentIndex];

    switch (operation.type) {
      case "create":
        const item = paper.project.activeLayer.children.find(
          (child) => child.data.id === operation.id
        );
        if (item) {
          if (this.selectTool) {
            this.selectTool.removeFromSelection(item);
          }
          item.remove();
        }
        break;

      case "modify":
        operation.modifications.forEach((mod) => {
          const modifiedItem = paper.project.activeLayer.children.find(
            (child) => child.data.id === mod.id
          );
          if (modifiedItem) {
            modifiedItem.importJSON(mod.oldState);
          }
        });
        if (this.selectTool) {
          this.selectTool.updateSelectionUI();
        }
        break;

      case "delete":
        paper.project.activeLayer.importJSON(operation.objectData);
        break;
    }

    this.currentIndex--;
    paper.view.update();
  }

  // 重做单个操作
  redo() {
    if (this.currentIndex >= this.operations.length - 1) return;

    this.currentIndex++;
    const operation = this.operations[this.currentIndex];

    switch (operation.type) {
      case "create":
        const importedItem = paper.project.activeLayer.importJSON(
          operation.objectData
        );
        if (!importedItem.data.id) {
          importedItem.data.id = this.nextId++;
        }
        break;

      case "modify":
        operation.modifications.forEach((mod) => {
          const modifiedItem = paper.project.activeLayer.children.find(
            (child) => child.data.id === mod.id
          );
          if (modifiedItem) {
            modifiedItem.importJSON(mod.newState);
          }
        });
        if (this.selectTool) {
          this.selectTool.updateSelectionUI();
        }
        break;

      case "delete":
        const item = paper.project.activeLayer.children.find(
          (child) => child.data.id === operation.id
        );
        if (item) {
          if (this.selectTool) {
            this.selectTool.removeFromSelection(item);
          }
          item.remove();
        }
        break;
    }

    paper.view.update();
  }

  // 工具管理方法
  registerTool(name, creator) {
    this.tools.set(name, creator);
  }

  setTool(name) {
    const creator = this.tools.get(name);
    if (creator) {
      this.currentTool = creator();
      this.currentTool.activate();
    }
  }

  // 添加设置选择工具的方法
  setSelectTool(selectTool) {
    this.selectTool = selectTool;
  }
}
