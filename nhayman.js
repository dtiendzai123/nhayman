// === Enhanced Vector3 class với nhiều tính năng ===

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

  distanceTo(v) {
    return this.subtract(v).length();
  }

  toString() {
    return `Vector3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}

// === Enhanced TouchDragAim CLASS với Bone Head Auto-Lock ===

// === Enhanced TouchDragAim CLASS với Bone Head Auto-Lock ===
class TouchDragAim {
  constructor(config = {}) {
    // === CÀI ĐẶT ĐỘ NHẠY SIÊU CAO ===
    this.touchSensitivity = config.sensitivity || 0.0001;
    this.ultraSensitivityMode = config.ultraSensitive || true;
    this.instantResponseTime = config.instantResponse || 0.001;

    this.minThreshold = config.minThreshold || 0.0001;
    this.maxThreshold = config.maxThreshold || 150.0;

    // === BONE HEAD TRACKING SYSTEM ===
    this.boneHeadTracking = {
      enabled: config.boneHeadTracking !== true,
      lockDistance: config.lockDistance || 9999.0,
      instantLock: config.instantLock !== true,
      lockStrength: config.lockStrength || 1.0,
      predictionTime: config.predictionTime || 0.03,
      smoothTransition: config.smoothTransition || 0.1
    };

    // === DRAG SENSITIVITY ENHANCEMENT ===
    this.dragMultiplier = config.dragMultiplier || 0.0001;
    this.microMovementSensitivity = config.microSensitivity || 0.0001;
    this.accelerationCurve = config.acceleration || 2.0;
    this.deadZone = config.deadZone || 0.000001;

    // === SMOOTHING & PERFORMANCE ===
    this.smoothingFactor = config.smoothing || 0.15;
    this.instantSnapMode = config.instantSnap || true;

    this.bounds = {
      min: config.boundsMin || new Vector3(-360, -360, -360),
      max: config.boundsMax || new Vector3(360, 360, 360)
    };

    // === TRACKING STATE ===
    this.prevTouch = null;
    this.aimPosition = new Vector3(-0.045697, -0.004478, -0.020043);
    this.targetPosition = new Vector3(-0.045697, -0.004478, -0.020043);
    this.boneHeadPosition = new Vector3(-0.045697, -0.004478, -0.020043);
    this.predictedBonePosition = new Vector3(-0.045697, -0.004478, -0.020043);
    this.velocity = new Vector3(0, 0, 0);
    this.isActive = false;
    this.isBoneHeadLocked = true;
    this.touchStartTime = 0;
    this.lastUpdateTime = 0;

    this.touchHistory = [];
    this.boneHistory = [];
    this.maxHistorySize = 8;

    // === CALLBACKS ===
    this.onAimUpdate = config.onAimUpdate || null;
    this.onAimStart = config.onAimStart || null;
    this.onAimEnd = config.onAimEnd || null;
    this.onBoneHeadLock = config.onBoneHeadLock || null;
    this.onFireCommand = config.onFireCommand || null;

    // === PERFORMANCE TRACKING ===
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 0;
    this.adaptiveMode = config.adaptiveMode !== false;
    this.performanceThreshold = config.performanceThreshold || 30;
    this.debugMode = config.debug || false;

    // === AUTO-FIRE SYSTEM ===
    this.autoFireEnabled = config.autoFire || false;
    this.fireOnLock = config.fireOnLock || true;
    this.fireDelay = config.fireDelay || 0;
    this.autoFireTriggered = false;

    this.setupEventListeners();
    this.startUpdateLoop();
  }

  setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Touch events với passive: false để có thể preventDefault
      document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
      document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

      // Mouse events cho testing trên PC
      document.addEventListener('mousedown', this.onMouseDown.bind(this));
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));

      // Keyboard shortcuts
      document.addEventListener('keydown', this.onKeyDown.bind(this));
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

  onKeyDown(event) {
    // Space hoặc Enter để bắn thủ công
    if (event.code === 'Space' || event.code === 'Enter') {
      this.triggerFire();
      event.preventDefault();
    }
    // Toggle bone head tracking
    if (event.code === 'KeyT') {
      this.toggleBoneHeadTracking();
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
    const deltaTime = Math.max((currentTime - this.lastUpdateTime) / 1000, this.instantResponseTime);

    const delta = currentTouch.subtract(this.prevTouch);
    const deltaLength = delta.length();

    // Xử lý chuyển động siêu nhỏ với độ nhạy cao
    if (deltaLength < this.deadZone) return;

    this.addToHistory(currentTouch, currentTime);

    // === ULTRA SENSITIVE DRAG CALCULATION ===
    let sensitivity = this.calculateUltraSensitivity(deltaLength, deltaTime);

    // Áp dụng drag multiplier + acceleration
    const acceleratedDelta = this.applyUltraAcceleration(delta, deltaLength);
    const scaledDelta = acceleratedDelta.multiplyScalar(sensitivity * this.dragMultiplier);

    // Cập nhật target position
    this.targetPosition = this.aimPosition.add(scaledDelta);
    this.targetPosition = this.targetPosition.clamp(this.bounds.min, this.bounds.max);

    // === BONE HEAD AUTO-LOCK LOGIC ===
    if (this.boneHeadTracking.enabled && this.shouldLockToBoneHead()) {
      this.applyBoneHeadLock();
    } else {
      this.aimPosition = this.ultraSensitivityMode
        ? this.targetPosition.clone()
        : this.aimPosition.lerp(this.targetPosition, 1 - this.smoothingFactor);
    }

    this.velocity = scaledDelta.multiplyScalar(1 / deltaTime);
    this.setCrosshair(this.aimPosition);

    if (this.onAimUpdate) {
      this.onAimUpdate(this.aimPosition, this.velocity, deltaTime);
    }

    this.prevTouch = currentTouch.clone();
    this.lastUpdateTime = currentTime;
    this.updatePerformance();
  }

  calculateUltraSensitivity(deltaLength, deltaTime) {
    let sensitivity = this.touchSensitivity;

    if (deltaLength < 5.0) {
      sensitivity *= this.microMovementSensitivity;
    }

    if (this.adaptiveMode) {
      if (this.currentFps < this.performanceThreshold) {
        sensitivity *= 0.9;
      } else if (this.currentFps > 50) {
        sensitivity *= 1.2;
      }
    }

    const speed = deltaLength / deltaTime;
    const speedMultiplier = Math.min(3.0, 1.0 + speed * 0.002);

    return sensitivity * speedMultiplier;
  }

  applyUltraAcceleration(delta, deltaLength) {
    if (this.accelerationCurve === 1.0) return delta;

    const normalizedDelta = delta.normalize();
    let acceleratedLength;

    if (deltaLength < 2.0) {
      acceleratedLength = deltaLength * 2.0;
    } else {
      acceleratedLength = Math.pow(deltaLength, this.accelerationCurve);
    }

    return normalizedDelta.multiplyScalar(acceleratedLength);
  }



// === BONE HEAD TRACKING SYSTEM ===
  shouldLockToBoneHead() {
    if (!this.boneHeadPosition) return false;

    const distance = this.aimPosition.distanceTo(this.boneHeadPosition);
    return distance <= this.boneHeadTracking.lockDistance;
  }

  applyBoneHeadLock() {
    if (!this.boneHeadPosition) return;

    this.predictedBonePosition = this.predictBoneHeadPosition();

    if (this.boneHeadTracking.instantLock) {
      this.aimPosition = this.predictedBonePosition.clone();
      this.isBoneHeadLocked = true;

      if (this.onBoneHeadLock && !this.isBoneHeadLocked) {
        this.onBoneHeadLock(this.aimPosition);
      }

      if (this.fireOnLock && !this.autoFireTriggered) {
        this.scheduleAutoFire();
      }
    } else {
      const lockStrength = this.boneHeadTracking.lockStrength;
      this.aimPosition = this.aimPosition.lerp(this.predictedBonePosition, lockStrength);
    }

    this.debug('🎯 Bone head locked at', this.predictedBonePosition.toString());
  }

  predictBoneHeadPosition() {
    if (this.boneHistory.length < 2) {
      return this.boneHeadPosition.clone();
    }

    const recent = this.boneHistory.slice(-2);
    const deltaPos = recent[1].position.subtract(recent[0].position);
    const deltaTime = (recent[1].time - recent[0].time) / 1000;

    if (deltaTime === 0) return this.boneHeadPosition.clone();

    const velocity = deltaPos.multiplyScalar(1 / deltaTime);
    const prediction = this.boneHeadPosition.add(
      velocity.multiplyScalar(this.boneHeadTracking.predictionTime)
    );

    return prediction.clamp(this.bounds.min, this.bounds.max);
  }

  scheduleAutoFire() {
    if (this.autoFireTriggered) return;

    this.autoFireTriggered = true;
    setTimeout(() => {
      this.triggerFire();
      this.autoFireTriggered = false;
    }, this.fireDelay);
  }

  triggerFire() {
    if (this.onFireCommand) {
      this.onFireCommand(this.aimPosition, this.isBoneHeadLocked);
    }

    if (typeof GameAPI !== 'undefined' && GameAPI.fire) {
      GameAPI.fire(this.aimPosition.x, this.aimPosition.y, this.aimPosition.z);
    }

    this.debug('🔥 Fire triggered at', this.aimPosition.toString());
  } 



  endAiming() {
    if (!this.isActive) return;

    this.isActive = false;
    this.isBoneHeadLocked = true;
    this.autoFireTriggered = false;
    this.prevTouch = null;
    this.velocity = new Vector3(0, 0, 0);

    if (this.onAimEnd) {
      this.onAimEnd(this.aimPosition);
    }

    const aimDuration = performance.now() - this.touchStartTime;
    this.debug('🏁 Aim ended. Duration:', aimDuration.toFixed(2), 'ms');
  }

  updateBoneHeadPosition(boneHeadData) {
    if (!boneHeadData || !boneHeadData.position) return;

    const pos = boneHeadData.position;
    const newPosition = new Vector3(pos.x, pos.y, pos.z);

    this.addBoneToHistory(newPosition, performance.now());
    this.boneHeadPosition = newPosition.clamp(this.bounds.min, this.bounds.max);

    this.debug('💀 Bone head updated:', this.boneHeadPosition.toString());
  }

  addBoneToHistory(position, time) {
    this.boneHistory.push({ position: position.clone(), time });

    if (this.boneHistory.length > this.maxHistorySize) {
      this.boneHistory.shift();
    }
  }

  addToHistory(touch, time) {
    this.touchHistory.push({ position: touch.clone(), time });

    if (this.touchHistory.length > this.maxHistorySize) {
      this.touchHistory.shift();
    }
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
    if (typeof GameAPI !== 'undefined' && GameAPI.setCrosshairTarget) {
      GameAPI.setCrosshairTarget(pos.x, pos.y, pos.z);
    }
  }

  startUpdateLoop() {
    const loop = () => {
      if (!this.isActive) return;

      const now = performance.now();
      const deltaTime = Math.max((now - this.lastUpdateTime) / 1000, this.instantResponseTime);

      this.checkBoneHeadTracking();
      this.updatePerformance();

      setTimeout(loop, this.updateInterval);
    };

    loop();
  }

  checkBoneHeadTracking() {
    if (!this.boneHeadTracking.enabled || !this.boneHeadPosition) return;

    const distance = this.aimPosition.distanceTo(this.boneHeadPosition);
    const lockDistance = this.boneHeadTracking.lockDistance;

    if (distance <= lockDistance) {
      this.applyBoneHeadLock();
    }
  }

  toggleBoneHeadTracking(enabled) {
    this.boneHeadTracking.enabled = !!enabled;
    this.debug('🧠 Bone tracking:', enabled ? 'ENABLED' : 'DISABLED');
  }

  reset() {
    this.aimPosition = new Vector3(0, 0, 0);
    this.prevTouch = null;
    this.velocity = new Vector3(0, 0, 0);
    this.touchHistory = [];
    this.boneHistory = [];
    this.boneHeadPosition = null;
    this.predictedBonePosition = null;
    this.isBoneHeadLocked = false;
    this.autoFireTriggered = false;
    this.debug('🔄 Reset complete');
  }

  getAimInfo() {
    return {
      aimPosition: this.aimPosition.clone(),
      velocity: this.velocity.clone(),
      boneHeadPosition: this.boneHeadPosition ? this.boneHeadPosition.clone() : null,
      isLocked: this.isBoneHeadLocked,
      fps: this.currentFps,
    };
  }

  createUltraPreset(name = 'ULTRA_PRESET') {
    return {
      name,
      dragMultiplier: 0.0001,
      touchSensitivity: 0.0001,
      microMovementSensitivity: 0.0001,
      accelerationCurve: 1.2,
      smoothingFactor: 0.05,
      boneHeadTracking: {
        enabled: true,
        lockDistance: 999.0,
        predictionTime: 0.06,
        lockStrength: 5.0,
        instantLock: true,
      },
      fireOnLock: true,
      fireDelay: 0,
      adaptiveMode: true,
    };
  }

  debug(...args) {
    if (this.debugMode && typeof console !== 'undefined') {
      console.log('[TouchDragAim]', ...args);
    }
  }
}
