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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderWatermarkedImage(file, settings, logoImg) {
  const url = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

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
    const pos = POSITIONS[settings.position](w, h, tw, th, margin);

    ctx.save();
    ctx.translate(pos.x + tw / 2, pos.y + th / 2);
    ctx.rotate((settings.rotation * Math.PI) / 180);
    if (settings.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = fontSize * 0.15;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }
    ctx.fillText(settings.text, -tw / 2, -th / 2);
    ctx.restore();
  }

  if ((settings.mode === 'logo' || settings.mode === 'both') && logoImg) {
    const logoW = (settings.logoSizePct / 100) * w;
    const logoH = logoImg.naturalHeight * (logoW / logoImg.naturalWidth);
    const pos = POSITIONS[settings.logoPosition](w, h, logoW, logoH, margin);

    ctx.save();
    ctx.translate(pos.x + logoW / 2, pos.y + logoH / 2);
    ctx.rotate((settings.logoRotation * Math.PI) / 180);
    ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
    ctx.restore();
  }

  ctx.restore();

  const quality = settings.quality / 100;
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export { loadImage };
