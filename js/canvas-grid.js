function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function mixColors(first, second) {
  if (!first) return second;
  if (!second) return first;
  return first.map((value, index) => Math.round((value + second[index]) / 2));
}

function writePixel(data, index, color, alpha = 255) {
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = alpha;
}

export class CanvasGrid {
  constructor(
    root,
    baseCanvas,
    analysisCanvas,
    interactionCanvas,
    animationCanvas,
  ) {
    this.root = root;
    this.baseCanvas = baseCanvas;
    this.analysisCanvas = analysisCanvas;
    this.interactionCanvas = interactionCanvas;
    this.animationCanvas = animationCanvas;
    this.baseContext = baseCanvas.getContext("2d", { alpha: false });
    this.analysisContext = analysisCanvas.getContext("2d");
    this.interactionContext = interactionCanvas.getContext("2d");
    this.animationContext = animationCanvas.getContext("2d", { alpha: false });
    this.size = 0;
    this.baseline = null;
    this.baselineImage = null;
    this.lastBaseMatrix = null;
    this.lastUseBaseline = null;
    this.analysisKey = "";
    this.searchAnimationToken = 0;
  }

  setModel(model) {
    this.size = model.matrix.length;
    this.baseline = model.matrix;
    this.root.setAttribute(
      "aria-label",
      `${this.size} by ${this.size} editable QR code`,
    );

    for (const canvas of [
      this.baseCanvas,
      this.analysisCanvas,
      this.interactionCanvas,
      this.animationCanvas,
    ]) {
      canvas.width = this.size;
      canvas.height = this.size;
    }
    this.baselineImage = this.makeMatrixImage(this.baseline);
    this.lastBaseMatrix = null;
    this.lastUseBaseline = null;
    this.analysisKey = "";
  }

  showSearchShell(model) {
    this.root.classList.remove("is-blank");
    const animationToken = ++this.searchAnimationToken;
    const size = model.matrix.length;
    this.animationCanvas.width = size;
    this.animationCanvas.height = size;
    const shellImage = this.animationContext.createImageData(size, size);
    const data = shellImage.data;

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const index = (row * size + column) * 4;
        const isDarkFunctionModule =
          model.functionMap[row][column] && model.matrix[row][column];
        const value = isDarkFunctionModule ? 45 : 238;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
    }

    this.animationContext.putImageData(shellImage, 0, 0);
    this.animateSearchData(model, shellImage, animationToken);
  }

  animateSearchData(model, shellImage, animationToken) {
    const size = model.matrix.length;
    const image = new ImageData(
      new Uint8ClampedArray(shellImage.data),
      size,
      size,
    );
    const modules = [];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (!model.functionMap[row][column]) {
          modules.push(row * size + column);
        }
      }
    }
    this.shuffle(modules);

    let filled = 0;
    let lastUpdate = 0;
    const initialBatchSize = Math.max(1, Math.ceil(modules.length / 45));
    const changingBatchSize = Math.max(1, Math.ceil(modules.length / 80));
    const drawFrame = (now) => {
      if (animationToken !== this.searchAnimationToken) return;
      if (now - lastUpdate >= 35) {
        lastUpdate = now;
        if (filled < modules.length) {
          const end = Math.min(modules.length, filled + initialBatchSize);
          for (; filled < end; filled += 1) {
            this.setRandomSearchModule(image, modules[filled]);
          }
        } else {
          for (let index = 0; index < changingBatchSize; index += 1) {
            const moduleIndex =
              modules[Math.floor(Math.random() * modules.length)];
            this.setRandomSearchModule(image, moduleIndex);
          }
        }
        this.animationContext.putImageData(image, 0, 0);
      }
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);
  }

  setRandomSearchModule(image, moduleIndex) {
    const dataIndex = moduleIndex * 4;
    const value = Math.random() < 0.5 ? 45 : 238;
    image.data[dataIndex] = value;
    image.data[dataIndex + 1] = value;
    image.data[dataIndex + 2] = value;
    image.data[dataIndex + 3] = 255;
  }

  shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
  }

  async animateMatrix(matrix, { erase = false, duration = 1000 } = {}) {
    this.searchAnimationToken += 1;
    const size = matrix.length;
    this.animationCanvas.width = size;
    this.animationCanvas.height = size;
    const image = this.makeAnimationImage(matrix, erase);
    const darkModules = [];

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (matrix[row][column]) darkModules.push(row * size + column);
      }
    }
    this.shuffle(darkModules);

    this.animationContext.putImageData(image, 0, 0);
    const startedAt = performance.now();
    let completed = 0;
    await new Promise((resolve) => {
      const drawFrame = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const target = Math.floor(darkModules.length * progress);
        while (completed < target) {
          const moduleIndex = darkModules[completed];
          const dataIndex = moduleIndex * 4;
          const value = erase ? 255 : 0;
          image.data[dataIndex] = value;
          image.data[dataIndex + 1] = value;
          image.data[dataIndex + 2] = value;
          completed += 1;
        }
        this.animationContext.putImageData(image, 0, 0);
        if (progress < 1) {
          requestAnimationFrame(drawFrame);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(drawFrame);
    });
  }

  clearAnimation({ keepBlank = false } = {}) {
    this.searchAnimationToken += 1;
    this.root.classList.remove(
      "is-busy",
      "is-searching",
      "is-revealing",
      "is-erasing",
      "is-blank",
    );
    if (keepBlank) {
      this.root.classList.add("is-blank");
      return;
    }
    this.animationContext.clearRect(
      0,
      0,
      this.animationCanvas.width,
      this.animationCanvas.height,
    );
  }

  makeAnimationImage(matrix, showDarkModules) {
    const size = matrix.length;
    const image = this.animationContext.createImageData(size, size);
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const value = showDarkModules && matrix[row][column] ? 0 : 255;
        const index = (row * size + column) * 4;
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    return image;
  }

  moduleFromPointer(event) {
    if (!this.size) return null;
    const bounds = this.root.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;

    const column = Math.floor(
      ((event.clientX - bounds.left) / bounds.width) * this.size,
    );
    const row = Math.floor(
      ((event.clientY - bounds.top) / bounds.height) * this.size,
    );
    if (row < 0 || row >= this.size || column < 0 || column >= this.size) {
      return null;
    }
    return { row, column };
  }

  renderBase(matrix, useBaseline = false) {
    if (
      matrix === this.lastBaseMatrix &&
      useBaseline === this.lastUseBaseline
    ) {
      return;
    }
    const image =
      useBaseline && this.baselineImage
        ? this.baselineImage
        : this.makeMatrixImage(matrix);
    this.baseContext.putImageData(image, 0, 0);
    this.lastBaseMatrix = matrix;
    this.lastUseBaseline = useBaseline;
  }

  renderOverlay({
    metadata,
    changedModules,
    previewChanges,
    previewRejected,
    showHighlights,
    showBlocks,
    showKinds,
    showChanges,
    hiddenBlocks,
    blockColors,
    kindColors,
  }) {
    const nextAnalysisKey = JSON.stringify([
      showHighlights,
      showBlocks,
      showKinds,
      [...hiddenBlocks].sort((a, b) => a - b),
    ]);
    if (nextAnalysisKey !== this.analysisKey) {
      const image = this.analysisContext.createImageData(this.size, this.size);
      const data = image.data;
      for (let row = 0; row < this.size; row += 1) {
        for (let column = 0; column < this.size; column += 1) {
          const dataIndex = (row * this.size + column) * 4;
          const meta = metadata[row][column];
          let color = null;
          let alpha = 0;

          if (showHighlights && meta.kind === "remainder") {
            color = [145, 145, 145];
            alpha = 210;
          }
          if (
            showHighlights &&
            showBlocks &&
            (meta.kind === "data" || meta.kind === "ecc") &&
            !hiddenBlocks.has(meta.blockIndex)
          ) {
            color = hexToRgb(blockColors[meta.blockIndex % blockColors.length]);
            alpha = 205;
          }
          if (
            showHighlights &&
            showKinds &&
            (meta.kind === "data" || meta.kind === "ecc")
          ) {
            color = mixColors(color, hexToRgb(kindColors[meta.kind]));
            alpha = 220;
          }
          if (color) writePixel(data, dataIndex, color, alpha);
        }
      }
      this.analysisContext.clearRect(0, 0, this.size, this.size);
      this.analysisContext.putImageData(image, 0, 0);
      this.analysisKey = nextAnalysisKey;
    }

    this.interactionContext.clearRect(0, 0, this.size, this.size);
    if (showHighlights && showChanges) {
      this.interactionContext.fillStyle = "rgba(208, 0, 0, 0.92)";
      for (const { row, column } of changedModules) {
        this.interactionContext.fillRect(column, row, 1, 1);
      }
    }
    this.interactionContext.fillStyle = previewRejected
      ? "rgba(208, 0, 0, 0.96)"
      : "rgba(240, 160, 0, 0.96)";
    for (const { row, column } of previewChanges) {
      this.interactionContext.fillRect(column, row, 1, 1);
    }
  }

  makeMatrixImage(matrix) {
    const image = this.baseContext.createImageData(this.size, this.size);
    const data = image.data;
    for (let row = 0; row < this.size; row += 1) {
      for (let column = 0; column < this.size; column += 1) {
        const value = matrix[row][column] ? 0 : 255;
        const index = (row * this.size + column) * 4;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
    }
    return image;
  }
}
