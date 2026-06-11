const moduleSize = 10;
const quietZoneModules = 4;

export function downloadQrPng(matrix, filename = "qr-code.png") {
  const gridSize = matrix.length;
  if (gridSize === 0) {
    return;
  }

  const imageSize = (gridSize + quietZoneModules * 2) * moduleSize;
  const quietZonePixels = quietZoneModules * moduleSize;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  canvas.width = imageSize;
  canvas.height = imageSize;

  context.fillStyle = "#fff";
  context.fillRect(0, 0, imageSize, imageSize);
  context.fillStyle = "#000";

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }

      context.fillRect(
        quietZonePixels + x * moduleSize,
        quietZonePixels + y * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
