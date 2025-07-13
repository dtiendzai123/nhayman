// === Enhanced Vector3 class với nhiều tính năng ===
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  subtract(v) {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  add(v) {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  multiplyScalar(s) {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  lerp(v, alpha) {
    return new Vector3(
      this.x + (v.x - this.x) * alpha,
      this.y + (v.y - this.y) * alpha,
      this.z + (v.z - this.z) * alpha
    );
  }

  clamp(min, max) {
    return new Vector3(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y)),
      Math.max(min.z, Math.min(max.z, this.z))
    );
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  toString() {
    return `Vector3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}

// === TouchDragAim CLASS BẮT ĐẦU ===
class TouchDragAim {
  constructor(config = {}) {
    this.touchSensitivity = config.sensitivity || 10.0;
    this.minThreshold = config.minThreshold || 0.001;
    this.maxThreshold = config.maxThreshold || 100.0;

    this.smoothingFactor = config.smoothing || 0.3;
    this.accelerationCurve = config.acceleration || 1.5;
    this.deadZone = config.deadZone || 0.00001;

    this.bounds = {
      min: config.boundsMin || new Vector3(-360, -360, -360),
      max: config.boundsMax || new Vector3(360, 360, 360)
    };

    this.prevTouch = null;

this.aimPosition = new Vector3(0, 0, 0);
    this.targetPosition = new Vector3(0, 0, 0);

    this.velocity = new Vector3(0, 0, 0);
    this.isActive = false;
    this.touchStartTime = 0;
    this.lastUpdateTime = 0;

    this.touchHistory = [];
    this.maxHistorySize = 5;

    this.onAimUpdate = config.onAimUpdate || null;
    this.onAimStart = config.onAimStart || null;
    this.onAimEnd = config.onAimEnd || null;

    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 0;

    this.adaptiveMode = config.adaptiveMode || false;
    this.performanceThreshold = config.performanceThreshold || 30;

    this.debugMode = config.debug || false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (typeof window !== 'undefined') {
      document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
      document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

      document.addEventListener('mousedown', this.onMouseDown.bind(this));
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  onTouchStart(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.startAiming(new Vector3(touch.clientX, touch.clientY, 0));
      event.preventDefault();
    }
  }

  onTouchMove(event) {
    if (event.touches.length === 1 && this.isActive) {
      const touch = event.touches[0];
      this.updateAiming(new Vector3(touch.clientX, touch.clientY, 0));
      event.preventDefault();
    }
  }

  onTouchEnd(event) {
    if (event.touches.length === 0) {
      this.endAiming();
    }
  }

  onMouseDown(event) {
    if (event.button === 0) {
      this.startAiming(new Vector3(event.clientX, event.clientY, 0));
    }
  }

  onMouseMove(event) {
    if (this.isActive) {
      this.updateAiming(new Vector3(event.clientX, event.clientY, 0));
    }
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.endAiming();
    }
  }

  startAiming(initialTouch) {
    this.isActive = true;
    this.prevTouch = initialTouch.clone();
    this.touchStartTime = performance.now();
    this.lastUpdateTime = this.touchStartTime;
    this.touchHistory = [];

    if (this.onAimStart) {
      this.onAimStart(this.aimPosition);
    }

    this.debug('🎯 Aim started at', initialTouch.toString());
  }

  updateAiming(currentTouch) {
    if (!this.isActive || !this.prevTouch) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    const delta = currentTouch.subtract(this.prevTouch);
    const deltaLength = delta.length();

    if (deltaLength < this.deadZone) {
      this.debug('⚪ In dead zone, ignoring movement');
      return;
    }

    this.addToHistory(currentTouch, currentTime);

    const dynamicSensitivity = this.calculateDynamicSensitivity(deltaLength, deltaTime);

    const acceleratedDelta = this.applyAcceleration(delta, deltaLength);
    const scaledDelta = acceleratedDelta.multiplyScalar(dynamicSensitivity);

    this.targetPosition = this.aimPosition.add(scaledDelta);
    this.targetPosition = this.targetPosition.clamp(this.bounds.min, this.bounds.max);

    this.aimPosition = this.smoothingFactor > 0
      ? this.aimPosition.lerp(this.targetPosition, 1 - this.smoothingFactor)
      : this.targetPosition.clone();

    this.velocity = scaledDelta.multiplyScalar(1 / deltaTime);

    this.setCrosshair(this.aimPosition);

    if (this.onAimUpdate) {
      this.onAimUpdate(this.aimPosition, this.velocity, deltaTime);
    }

    this.prevTouch = currentTouch.clone();
    this.lastUpdateTime = currentTime;

    this.updatePerformance();
  }

  endAiming() {
    if (!this.isActive) return;

    this.isActive = false;
    this.prevTouch = null;
    this.velocity = new Vector3(0, 0, 0);

    if (this.onAimEnd) {
      this.onAimEnd(this.aimPosition);
    }

    const aimDuration = performance.now() - this.touchStartTime;
    this.debug('🏁 Aim ended. Duration:', aimDuration.toFixed(2), 'ms');
  }

  calculateDynamicSensitivity(deltaLength, deltaTime) {
    let sensitivity = this.touchSensitivity;

    if (this.adaptiveMode) {
      if (this.currentFps < this.performanceThreshold) {
        sensitivity *= 0.8;
      } else if (this.currentFps > 50) {
        sensitivity *= 1.1;
      }
    }

    const speed = deltaLength / deltaTime;
    const speedMultiplier = Math.min(2.0, 1.0 + speed * 0.001);

    return sensitivity * speedMultiplier;
  }

  applyAcceleration(delta, deltaLength) {
    if (this.accelerationCurve === 1.0) return delta;

    const normalizedDelta = delta.normalize();
    const acceleratedLength = Math.pow(deltaLength, this.accelerationCurve);

    return normalizedDelta.multiplyScalar(acceleratedLength);
  }

  addToHistory(touch, time) {
    this.touchHistory.push({ position: touch.clone(), time });

    if (this.touchHistory.length > this.maxHistorySize) {
      this.touchHistory.shift();
    }
  }

  predictNextPosition(lookaheadTime = 0.016) {
    if (this.touchHistory.length < 2) return this.aimPosition;

    const recent = this.touchHistory.slice(-2);
    const deltaPos = recent[1].position.subtract(recent[0].position);
    const deltaTime = (recent[1].time - recent[0].time) / 1000;

    if (deltaTime === 0) return this.aimPosition;

    const velocity = deltaPos.multiplyScalar(1 / deltaTime);
    const prediction = this.aimPosition.add(velocity.multiplyScalar(lookaheadTime));

    return prediction.clamp(this.bounds.min, this.bounds.max);
  }

  updatePerformance() {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastFpsUpdate > 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      this.debug('📊 FPS:', this.currentFps);
    }
  }

  setCrosshair(pos) {
    this.debug('🎯 Crosshair:', pos.toString());
    if (typeof GameAPI !== 'undefined' && GameAPI.setCrosshairTarget) {
      GameAPI.setCrosshairTarget(pos.x, pos.y, pos.z);
    }
  }

  debug(...args) {
    if (this.debugMode) {
      console.log('[TouchDragAim]', ...args);
    }
  }

  // === Gắn dữ liệu bone head vào targetPosition ===
  updateTargetFromBone(boneHeadData) {
    if (!boneHeadData || !boneHeadData.position) return;

    const pos = boneHeadData.position;

    this.targetPosition = new Vector3(pos.x, pos.y, pos.z).clamp(
      this.bounds.min,
      this.bounds.max
    );

    // Làm mượt tâm ngắm dần theo target mới
    this.aimPosition = this.smoothingFactor > 0
      ? this.aimPosition.lerp(this.targetPosition, 1 - this.smoothingFactor)
      : this.targetPosition.clone();

    // Cập nhật lại crosshair trên màn hình
    this.setCrosshair(this.aimPosition);

    this.debug('🎯 Target updated from bone head:', this.targetPosition.toString());
  }

  // === Public API ===

  setSensitivity(sensitivity) {
    this.touchSensitivity = Math.max(0.1, Math.min(10.0, sensitivity));
    this.debug('🔧 Sensitivity changed to:', this.touchSensitivity);
  }

  setSmoothing(factor) {
    this.smoothingFactor = Math.max(0.0, Math.min(0.95, factor));
    this.debug('🔧 Smoothing changed to:', this.smoothingFactor);
  }

  setBounds(min, max) {
    this.bounds.min = min.clone();
    this.bounds.max = max.clone();
    this.debug('🔧 Bounds changed to:', min.toString(), '-', max.toString());
  }

  reset() {
    this.aimPosition = new Vector3(0, 0, 0);
    this.targetPosition = new Vector3(0, 0, 0);
    this.velocity = new Vector3(0, 0, 0);
    this.touchHistory = [];
    this.debug('🔄 Reset aim position');
  }

  getAimInfo() {
    return {
      position: this.aimPosition.clone(),
      velocity: this.velocity.clone(),
      isActive: this.isActive,
      fps: this.currentFps,
      prediction: this.predictNextPosition()
    };
  }

  static createPreset(presetName, customConfig = {}) {
    const presets = {
      precise: {
        sensitivity: 1.5,
        smoothing: 0.9,
        acceleration: 1.0,
        minThreshold: 0.001,
        adaptiveMode: true
      },
      responsive: {
        sensitivity: 3.0,
        smoothing: 0.7,
        acceleration: 1.3,
        minThreshold: 0.003,
        adaptiveMode: true
      },
      smooth: {
        sensitivity: 2.0,
        smoothing: 0.95,
        acceleration: 1.1,
        minThreshold: 0.002,
        adaptiveMode: false
      },
      gaming: {
        sensitivity: 4.0,
        smoothing: 0.6,
        acceleration: 1.5,
        minThreshold: 0.005,
        adaptiveMode: true,
        debug: true
      }
    };

const aimSystem = new TouchDragAim({ sensitivity: 5.0 });

// Mỗi khung hình (frame)
function updateFrame() {
  const boneHeadData = {
    position: {
      x: -0.0456970781,
      y: -0.004478302,
      z: -0.0200432576
    }
  };

  aimSystem.updateTargetFromBone(boneHeadData);
}

    const config = { ...presets[presetName], ...customConfig };
    return new TouchDragAim(config);
  }
}

// Export for Node.js or module system
if (typeof module !== 'undefined') {
  module.exports = { TouchDragAim, Vector3 };
}
