// Lightweight signature pad on a <canvas>. Supports mouse and touch.
window.SignaturePad = class SignaturePad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this.empty = true;
    this._resize();
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#111';

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = (e) => { e.preventDefault(); this.drawing = true; const { x, y } = pos(e); this.ctx.beginPath(); this.ctx.moveTo(x, y); };
    const move = (e) => { if (!this.drawing) return; e.preventDefault(); const { x, y } = pos(e); this.ctx.lineTo(x, y); this.ctx.stroke(); this.empty = false; };
    const end = () => { this.drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }
  _resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 140;
    this.canvas.width = w * ratio;
    this.canvas.height = h * ratio;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(ratio, ratio);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, w, h);
  }
  clear() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, w, h);
    this.empty = true;
  }
  isEmpty() { return this.empty; }
  toDataURL() { return this.empty ? null : this.canvas.toDataURL('image/png'); }
};
