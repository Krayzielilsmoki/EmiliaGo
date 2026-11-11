// High-Performance Zero-Allocation Object Pools for Particle Effects & Floating Text
// Eliminates Garbage Collection (GC) pauses and micro-stutters in Android WebView

export class ParticlePool {
  constructor(maxSize = 64) {
    this.maxSize = maxSize;
    this.pool = new Array(maxSize);
    for (let i = 0; i < maxSize; i++) {
      this.pool[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 4,
        color: '#FFFFFF',
        life: 0,
        maxLife: 1,
        kind: 'circle',
        gravity: 0,
      };
    }
  }

  spawn(x, y, vx, vy, r, color, life = 0.5, kind = 'circle', gravity = 0) {
    for (let i = 0; i < this.maxSize; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.r = r;
        p.color = color;
        p.life = life;
        p.maxLife = life;
        p.kind = kind;
        p.gravity = gravity;
        return p;
      }
    }
    // If pool is saturated, reuse the oldest particle
    let oldest = this.pool[0];
    for (let i = 1; i < this.maxSize; i++) {
      if (this.pool[i].life < oldest.life) oldest = this.pool[i];
    }
    oldest.active = true;
    oldest.x = x;
    oldest.y = y;
    oldest.vx = vx;
    oldest.vy = vy;
    oldest.r = r;
    oldest.color = color;
    oldest.life = life;
    oldest.maxLife = life;
    oldest.kind = kind;
    oldest.gravity = gravity;
    return oldest;
  }

  update(dt) {
    for (let i = 0; i < this.maxSize; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  }

  clear() {
    for (let i = 0; i < this.maxSize; i++) {
      this.pool[i].active = false;
    }
  }
}

export class FloatingTextPool {
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this.pool = new Array(maxSize);
    for (let i = 0; i < maxSize; i++) {
      this.pool[i] = {
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '#FFFFFF',
        life: 0,
        maxLife: 1,
        vy: -50,
      };
    }
  }

  spawn(x, y, text, color = '#FFFFFF', life = 0.95, vy = -50) {
    for (let i = 0; i < this.maxSize; i++) {
      const t = this.pool[i];
      if (!t.active) {
        t.active = true;
        t.x = x;
        t.y = y;
        t.text = text;
        t.color = color;
        t.life = life;
        t.maxLife = life;
        t.vy = vy;
        return t;
      }
    }
    // Recycle oldest if pool full
    let oldest = this.pool[0];
    for (let i = 1; i < this.maxSize; i++) {
      if (this.pool[i].life < oldest.life) oldest = this.pool[i];
    }
    oldest.active = true;
    oldest.x = x;
    oldest.y = y;
    oldest.text = text;
    oldest.color = color;
    oldest.life = life;
    oldest.maxLife = life;
    oldest.vy = vy;
    return oldest;
  }

  update(dt) {
    for (let i = 0; i < this.maxSize; i++) {
      const t = this.pool[i];
      if (!t.active) continue;
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) {
        t.active = false;
      }
    }
  }

  clear() {
    for (let i = 0; i < this.maxSize; i++) {
      this.pool[i].active = false;
    }
  }
}
