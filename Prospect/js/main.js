import { CircleTool } from "./tools/CircleTool.js";
import { RectangleTool } from "./tools/RectangleTool.js";
import { SelectTool } from "./tools/SelectTool.js";

window.onload = function () {
  // 初始化 Paper.js
  paper.install(window);
  const canvas = document.getElementById("canvas");
  paper.setup(canvas);

  // 创建工具实例
  const circleTool = new CircleTool();
  const rectangleTool = new RectangleTool();
  const selectTool = new SelectTool();

  // 工具按钮点击事件
  const selectButton = document.getElementById("selectButton");
  const circleButton = document.getElementById("circleButton");
  const rectangleButton = document.getElementById("rectangleButton");

  // 创建一个通用的清除选择状态的函数
  function clearSelection() {
    // 调用选择工具的 deactivate 方法来清除选择框和状态
    selectTool.deactivate();

    // 清除所有对象的选中状态
    paper.project.activeLayer.children.forEach((item) => {
      if (item.selected) {
        item.selected = false;
      }
    });
  }

  selectButton.onclick = function () {
    clearSelection();
    document
      .querySelectorAll(".tool-button")
      .forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    selectTool.activate();
    console.log("SelectTool: Activated via button");
  };

  circleButton.onclick = function () {
    clearSelection();
    document
      .querySelectorAll(".tool-button")
      .forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    circleTool.activate();
    console.log("CircleTool: Activated via button");
  };

  rectangleButton.onclick = function () {
    clearSelection();
    document
      .querySelectorAll(".tool-button")
      .forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    rectangleTool.activate();
    console.log("RectangleTool: Activated via button");
  };

  // 默认激活选择工具
  selectButton.click();

  // 设置视图更新
  paper.view.onFrame = function (event) {
    paper.view.update();
  };
};
