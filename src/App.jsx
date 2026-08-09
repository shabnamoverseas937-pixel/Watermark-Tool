import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { renderWatermarkedImage, loadImage, POSITIONS } from './watermark';
import './index.css';

const POSITION_KEYS = Object.keys(POSITIONS);
const MAX_FILES = 20;

const defaultSettings = {
  mode: 'text',
  text: 'Your Business Name',
  fontFamily: 'Arial, sans-serif',
  fontSize: 36,
  bold: true,
  color: '#ffffff',
  shadow: true,
  position: 'bottom-right',
  logoPosition: 'bottom-right',
  logoSizePct: 18,
  logoRotation: 0,
  rotation: 0,
  opacity: 0.85,
  marginPct: 3,
  quality: 92,
  tile: false,
  tileSpacing: 60,
};

const PREVIEW_MAX_DIMENSION = 900;

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function usePersistentSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('watermark-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  useEffect(() => {
    localStorage.setItem('watermark-settings', JSON.stringify(settings));
  }, [settings]);
  return [settings, setSettings];
}

export default function App() {
  const [settings, setSettings] = usePersistentSettings();
  const [files, setFiles] = useState([]); // { id, file, url }
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const onFilesSelected = (fileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => {
      const combined = [...prev, ...incoming.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, file: f }))];
      return combined.slice(0, MAX_FILES);
    });
  };

  const onLogoSelected = (fileList) => {
    const f = fileList[0];
    if (!f) return;
    setLogoFile(f);
  };

  useEffect(() => {
    if (!logoFile) {
      setLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (previewIndex >= files.length) setPreviewIndex(0);
  }, [files, previewIndex]);

  const debouncedSettings = useDebouncedValue(settings, 120);

  // Live preview render, debounced and downscaled so it keeps up while dragging sliders
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    async function run() {
      if (files.length === 0) {
        setPreviewUrl(null);
        return;
      }
      const current = files[previewIndex];
      if (!current) return;
      const logoImg = logoUrl ? await loadImage(logoUrl) : null;
      const blob = await renderWatermarkedImage(current.file, debouncedSettings, logoImg, {
        maxDimension: PREVIEW_MAX_DIMENSION,
      });
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }
    run();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, previewIndex, debouncedSettings, logoUrl]);

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const clearAll = () => setFiles([]);

  const exportAll = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setProgress(0);
    try {
      const logoImg = logoUrl ? await loadImage(logoUrl) : null;
      if (files.length === 1) {
        const blob = await renderWatermarkedImage(files[0].file, settings, logoImg);
        saveAs(blob, watermarkedName(files[0].file.name));
        setProgress(1);
      } else {
        const zip = new JSZip();
        for (let i = 0; i < files.length; i++) {
          const blob = await renderWatermarkedImage(files[i].file, settings, logoImg);
          zip.file(watermarkedName(files[i].file.name), blob);
          setProgress((i + 1) / files.length);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `watermarked-photos-${Date.now()}.zip`);
      }
      setFiles([]);
    } finally {
      setBusy(false);
    }
  };

  const dropHandlers = {
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      onFilesSelected(e.dataTransfer.files);
    },
  };

  const remainingSlots = MAX_FILES - files.length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span>Safa Watermark Tool</span>
        </div>
        <p className="tagline">Batch watermark 5–20 photos, right in your browser — iPhone &amp; Android friendly.</p>
      </header>

      <main className="layout">
        <section className="panel preview-panel">
          <div className="dropzone" {...dropHandlers} onClick={() => fileInputRef.current?.click()}>
            {previewUrl ? (
              <img className="preview-img" src={previewUrl} alt="Watermark preview" />
            ) : (
              <div className="dropzone-empty">
                <p>Tap to choose photos or drag them here</p>
                <p className="hint">JPG or PNG · up to {MAX_FILES} at a time</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                onFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="filmstrip">
              {files.map((f, i) => (
                <div
                  key={f.id}
                  className={`thumb ${i === previewIndex ? 'active' : ''}`}
                  onClick={() => setPreviewIndex(i)}
                >
                  <ThumbImage file={f.file} />
                  <button
                    className="thumb-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(f.id);
                    }}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              {remainingSlots > 0 && (
                <button className="thumb add-more" onClick={() => fileInputRef.current?.click()}>
                  + Add
                  <span className="hint">{remainingSlots} left</span>
                </button>
              )}
            </div>
          )}

          <div className="batch-actions">
            <span className="count">{files.length} photo{files.length === 1 ? '' : 's'} loaded</span>
            <div className="spacer" />
            {files.length > 0 && (
              <button className="btn ghost" onClick={clearAll} disabled={busy}>
                Clear all
              </button>
            )}
            <button className="btn primary" onClick={exportAll} disabled={files.length === 0 || busy}>
              {busy ? `Processing… ${Math.round(progress * 100)}%` : `Download watermarked (${files.length})`}
            </button>
          </div>
        </section>

        <section className="panel controls-panel">
          <h2>Watermark settings</h2>

          <div className="field">
            <label>Type</label>
            <div className="segmented">
              {['text', 'logo', 'both'].map((m) => (
                <button
                  key={m}
                  className={settings.mode === m ? 'active' : ''}
                  onClick={() => update('mode', m)}
                >
                  {m === 'text' ? 'Text' : m === 'logo' ? 'Logo' : 'Text + Logo'}
                </button>
              ))}
            </div>
          </div>

          {(settings.mode === 'text' || settings.mode === 'both') && (
            <>
              <div className="field">
                <label>Watermark text</label>
                <input
                  type="text"
                  value={settings.text}
                  onChange={(e) => update('text', e.target.value)}
                  placeholder="e.g. © Your Name"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Font size</label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={settings.fontSize}
                    onChange={(e) => update('fontSize', Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>Color</label>
                  <input type="color" value={settings.color} onChange={(e) => update('color', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <label className="checkbox">
                  <input type="checkbox" checked={settings.bold} onChange={(e) => update('bold', e.target.checked)} />
                  Bold
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={settings.shadow} onChange={(e) => update('shadow', e.target.checked)} />
                  Shadow (better contrast)
                </label>
              </div>
              {!settings.tile && (
                <div className="field">
                  <label>Text position</label>
                  <PositionGrid value={settings.position} onChange={(v) => update('position', v)} />
                </div>
              )}
            </>
          )}

          <div className="field">
            <label className="checkbox">
              <input type="checkbox" checked={settings.tile} onChange={(e) => update('tile', e.target.checked)} />
              Tile watermark across the whole photo
            </label>
          </div>

          {settings.tile && (
            <div className="field">
              <label>Tile spacing ({settings.tileSpacing}%)</label>
              <input
                type="range"
                min="0"
                max="200"
                value={settings.tileSpacing}
                onChange={(e) => update('tileSpacing', Number(e.target.value))}
              />
            </div>
          )}

          {(settings.mode === 'logo' || settings.mode === 'both') && (
            <>
              <div className="field">
                <label>Logo image</label>
                <div className="logo-row">
                  <button className="btn ghost" onClick={() => logoInputRef.current?.click()}>
                    {logoFile ? 'Change logo' : 'Upload logo (PNG recommended)'}
                  </button>
                  {logoUrl && <img className="logo-thumb" src={logoUrl} alt="Logo" />}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      onLogoSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              <div className="field">
                <label>Logo size ({settings.logoSizePct}% of width)</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={settings.logoSizePct}
                  onChange={(e) => update('logoSizePct', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Logo rotation ({settings.logoRotation}°)</label>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={settings.logoRotation}
                  onChange={(e) => update('logoRotation', Number(e.target.value))}
                />
              </div>
              {!settings.tile && (
                <div className="field">
                  <label>Logo position</label>
                  <PositionGrid value={settings.logoPosition} onChange={(v) => update('logoPosition', v)} />
                </div>
              )}
            </>
          )}

          <div className="field">
            <label>Opacity ({Math.round(settings.opacity * 100)}%)</label>
            <input
              type="range"
              min="10"
              max="100"
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => update('opacity', Number(e.target.value) / 100)}
            />
          </div>

          <div className="field">
            <label>Rotation of text ({settings.rotation}°)</label>
            <input
              type="range"
              min="-45"
              max="45"
              value={settings.rotation}
              onChange={(e) => update('rotation', Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Margin from edge ({settings.marginPct}%)</label>
            <input
              type="range"
              min="0"
              max="15"
              value={settings.marginPct}
              onChange={(e) => update('marginPct', Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Output quality ({settings.quality}%)</label>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.quality}
              onChange={(e) => update('quality', Number(e.target.value))}
            />
          </div>

          <p className="privacy-note">
            Everything runs on this device — your photos are never uploaded anywhere.
          </p>
        </section>
      </main>
    </div>
  );
}

function watermarkedName(originalName) {
  const dot = originalName.lastIndexOf('.');
  const base = dot === -1 ? originalName : originalName.slice(0, dot);
  const ext = dot === -1 ? 'jpg' : originalName.slice(dot + 1);
  const safeExt = ['jpg', 'jpeg', 'png'].includes(ext.toLowerCase()) ? ext : 'jpg';
  return `${base}-watermarked.${safeExt}`;
}

function PositionGrid({ value, onChange }) {
  return (
    <div className="position-grid">
      {POSITION_KEYS.map((key) => (
        <button
          key={key}
          className={`position-cell ${value === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
          aria-label={key}
        />
      ))}
    </div>
  );
}

function ThumbImage({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={file.name} />;
}
