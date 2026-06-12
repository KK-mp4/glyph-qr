const quietZoneModules = 4;

export function downloadQrSvg(matrix, filename = "qr-code.svg") {
  const gridSize = matrix.length;
  if (gridSize === 0) return;

  const imageSize = gridSize + quietZoneModules * 2;
  const modules = [];
  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      if (matrix[row][column]) {
        modules.push(
          `<rect x="${quietZoneModules + column}" y="${quietZoneModules + row}" width="1" height="1"/>`,
        );
      }
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageSize} ${imageSize}" shape-rendering="crispEdges">`,
    `<rect width="${imageSize}" height="${imageSize}" fill="#fff"/>`,
    `<g fill="#000">${modules.join("")}</g>`,
    "</svg>",
  ].join("");
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
