import { CustomCanvas } from "./canvas/CustomCanvas.js";
import { SelectTool } from "./canvas/selectTool.js";

window.onload = function () {
  window.customCanvas = new CustomCanvas("canvas");
  const tools = new Map();
  const selectTool = new SelectTool(window.customCanvas);

  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = () => {
    console.log("Connected to development server");
    loadTool("circle");
    loadTool("rectangle");
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("Received message:", data);

    if (data.type === "init") {
      data.tools.forEach((name) => {
        if (!tools.has(name)) {
          loadTool(name);
        }
      });
    } else if (data.type === "change") {
      loadTool(data.tool, true);
    }
  };

  document.getElementById("circleButton").onclick = () => {
    activateTool("circle");
  };

  document.getElementById("rectangleButton").onclick = () => {
    activateTool("rectangle");
  };

  document.getElementById("selectButton").onclick = () => {
    // 移除所有工具的活跃状态
    tools.forEach((data) => {
      if (data.tool) {
        data.tool.remove();
        data.tool = null;
      }
    });

    // 清除选择工具的状态
    selectTool.clearSelection();

    const tool = new paper.Tool();
    tool.onMouseDown = (event) => selectTool.handleMouseDown(event);
    tool.onMouseDrag = (event) => selectTool.handleMouseDrag(event);
    tool.onMouseUp = (event) => selectTool.handleMouseUp(event);
    tool.activate();
  };

  async function loadTool(toolName, isReload = false) {
    try {
      if (isReload && tools.has(toolName)) {
        const oldTool = tools.get(toolName);
        if (oldTool.tool) {
          oldTool.tool.remove();
        }
        tools.delete(toolName);
      }

      const response = await fetch(`/js/tools/${toolName}.js?t=${Date.now()}`);

      if (!response.ok) {
        throw new Error(
          `Failed to load tool ${toolName}: ${response.statusText}`
        );
      }
      const code = await response.text();

      // 创建一个独立的作用域来执行工具代码
      const scope = {
        paper: paper,
        Path: paper.Path,
        onMouseDown: null,
        onMouseDrag: null,
        onMouseUp: null,
      };

      // 执行工具代码，将事件处理函数绑定到scope
      const func = new Function(
        "paper",
        "Path",
        "onMouseDown",
        "onMouseDrag",
        "onMouseUp",
        `
        ${code}
        return { onMouseDown, onMouseDrag, onMouseUp };
        `
      );

      const handlers = func.call(
        scope,
        scope.paper,
        scope.Path,
        scope.onMouseDown,
        scope.onMouseDrag,
        scope.onMouseUp
      );

      tools.set(toolName, {
        handlers: handlers,
        tool: null,
      });

      console.log(`Tool ${toolName} loaded successfully`);
    } catch (error) {
      console.error(`Error loading tool ${toolName}:`, error);
    }
  }

  function activateTool(toolName) {
    const toolData = tools.get(toolName);
    if (toolData) {
      // 移除所有工具的活跃状态
      tools.forEach((data) => {
        if (data.tool) {
          data.tool.remove();
          data.tool = null;
        }
      });

      // 清除选择工具的状态
      if (selectTool) {
        selectTool.clearSelection();
      }

      // 创建并激活新工具
      const tool = new paper.Tool();
      tool.onMouseDown = toolData.handlers.onMouseDown;
      tool.onMouseDrag = toolData.handlers.onMouseDrag;
      tool.onMouseUp = toolData.handlers.onMouseUp;
      tool.activate();

      // 更新工具引用
      toolData.tool = tool;
      console.log(`Activated ${toolName} tool`);
    } else {
      console.error(`Tool ${toolName} not found`);
      loadTool(toolName);
    }
  }
};
