export function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function glowCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha = 1): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color.replace("ALPHA", String(alpha)));
  gradient.addColorStop(1, color.replace("ALPHA", "0"));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

export function drawStars(context: CanvasRenderingContext2D, width: number, height: number, time: number, density = 0.00008): void {
  const count = Math.floor(width * height * density) + 24;
  context.fillStyle = "rgba(216, 242, 255, .72)";
  for (let index = 0; index < count; index += 1) {
    const x = ((index * 97.13) % width + width) % width;
    const y = ((index * 41.79) % (height * 0.66) + height * 0.66) % (height * 0.66);
    const twinkle = 0.3 + 0.7 * ((Math.sin(time * 0.7 + index * 1.83) + 1) / 2);
    context.globalAlpha = twinkle;
    context.fillRect(x, y, index % 5 === 0 ? 1.8 : 1, index % 5 === 0 ? 1.8 : 1);
  }
  context.globalAlpha = 1;
}
