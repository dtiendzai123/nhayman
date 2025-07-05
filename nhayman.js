class TouchDragAim {
  constructor() {
    this.touchSensitivity = 2.5; // 👈 Tăng cao để không delay, phản hồi nhanh
    this.minThreshold = 0.002;   // 👈 Không áp dụng nếu drag quá nhẹ (lọc rung tay)
    this.prevTouch = null;
    this.aimPosition = new Vector3(0, 0, 0); // vị trí ban đầu của crosshair
  }

  onTouchMove(currentTouch) {
    if (!this.prevTouch) {
      this.prevTouch = currentTouch.clone();
      return;
    }

    // Tính delta drag
    const delta = currentTouch.subtract(this.prevTouch);

    // Nếu quá nhỏ thì bỏ qua (giảm rung nhẹ)
    if (delta.length() < this.minThreshold) return;

    // Áp dụng độ nhạy cao tức thì
    const appliedDelta = delta.multiplyScalar(this.touchSensitivity);
    this.aimPosition = this.aimPosition.add(appliedDelta);

    // Cập nhật crosshair ngay lập tức
    this.setCrosshair(this.aimPosition);

    this.prevTouch = currentTouch.clone();
  }

  setCrosshair(pos) {
    console.log("📱 Instant Crosshair:", pos.x.toFixed(5), pos.y.toFixed(5), pos.z.toFixed(5));
    // GameAPI.setCrosshairTarget(pos.x, pos.y, pos.z); // Gọi API thật nếu có
  }

  onTouchEnd() {
    this.prevTouch = null; // reset sau khi nhả tay
  }
}

// === Vector3 class dùng chung ===
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  multiplyScalar(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  clone() { return new Vector3(this.x, this.y, this.z); }
}
