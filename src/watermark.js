export const POSITIONS = {
  'top-left': (w, h, bw, bh, m) => ({ x: m, y: m }),
  'top-center': (w, h, bw, bh, m) => ({ x: (w - bw) / 2, y: m }),
  'top-right': (w, h, bw, bh, m) => ({ x: w - bw - m, y: m }),
  'center-left': (w, h, bw, bh, m) => ({ x: m, y: (h - bh) / 2 }),
  center: (w, h, bw, bh, m) => ({ x: (w - bw) / 2, y: (h - bh) / 2 }),
  'center-right': (w, h, bw, bh, m) => ({ x: w - bw - m, y: (h - bh) / 2 }),
  'bottom-left': (w, h, bw, bh, m) => ({ x: m, y: h - bh - m }),
  'bottom-center': (w, h, bw, bh, m) => ({ x: (w - bw) / 2, y: h - bh - m }),
  'bottom-right': (w, h, bw, bh, m) => ({ x: w - bw - m, y: h - bh - m }),
};

function drawTiled(ctx, w, h, angleDeg, stepX, stepY, draw) {
  ctx.save();
  const cx = w / 2;
  const cy = h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  const diag = Math.sqrt(w * w + h * h);
  const startX = cx - diag;
  const endX = cx + diag;
  const startY = cy - diag;
  const endY = cy + diag;

  let row = 0;
  for (let y = startY; y <= endY; y += stepY) {
    const offset = (row % 2) * (stepX / 2);
    for (let x = startX - offset; x <= endX; x += stepX) {
      draw(x, y);
    }
    row++;
  }
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderWatermarkedImage(file, settings, logoImg, { maxDimension } = {}) {
  const url = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  let targetW = img.naturalWidth;
  let targetH = img.naturalHeight;
  if (maxDimension && Math.max(targetW, targetH) > maxDimension) {
    const downscale = maxDimension / Math.max(targetW, targetH);
    targetW = Math.round(targetW * downscale);
    targetH = Math.round(targetH * downscale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const { width: w, height: h } = canvas;
  const margin = (settings.marginPct / 100) * Math.min(w, h);
  const scale = w / 1000; // reference scale so sizes feel consistent across photo resolutions

  ctx.save();
  ctx.globalAlpha = settings.opacity;

  if (settings.mode === 'text' || settings.mode === 'both') {
    const fontSize = Math.max(8, settings.fontSize * scale);
    ctx.font = `${settings.bold ? 'bold' : ''} ${fontSize}px ${settings.fontFamily}`;
    ctx.fillStyle = settings.color;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(settings.text);
    const tw = metrics.width;
    const th = fontSize * 1.2;
    if (settings.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = fontSize * 0.15;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }

    if (settings.tile) {
      const gap = 1 + settings.tileSpacing / 100;
      const stepX = tw * gap;
      const stepY = th * gap * 2;
      drawTiled(ctx, w, h, settings.rotation, stepX, stepY, (x, y) => {
        ctx.fillText(settings.text, x - tw / 2, y - th / 2);
      });
    } else {
      const pos = POSITIONS[settings.position](w, h, tw, th, margin);
      ctx.save();
      ctx.translate(pos.x + tw / 2, pos.y + th / 2);
      ctx.rotate((settings.rotation * Math.PI) / 180);
      ctx.fillText(settings.text, -tw / 2, -th / 2);
      ctx.restore();
    }
  }

  if ((settings.mode === 'logo' || settings.mode === 'both') && logoImg) {
    const logoW = (settings.logoSizePct / 100) * w;
    const logoH = logoImg.naturalHeight * (logoW / logoImg.naturalWidth);

    if (settings.tile) {
      const gap = 1 + settings.tileSpacing / 100;
      const stepX = logoW * gap;
      const stepY = logoH * gap;
      drawTiled(ctx, w, h, settings.logoRotation, stepX, stepY, (x, y) => {
        ctx.drawImage(logoImg, x - logoW / 2, y - logoH / 2, logoW, logoH);
      });
    } else {
      const pos = POSITIONS[settings.logoPosition](w, h, logoW, logoH, margin);
      ctx.save();
      ctx.translate(pos.x + logoW / 2, pos.y + logoH / 2);
      ctx.rotate((settings.logoRotation * Math.PI) / 180);
      ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
      ctx.restore();
    }
  }

  ctx.restore();

  const quality = settings.quality / 100;
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export { loadImage };
