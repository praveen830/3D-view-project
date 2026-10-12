import * as THREE from 'three';

/**
 * Single Authoritative Simulation Clock
 * Governs frame-rate independent physics advancement, active-tab clamping,
 * atomic time leaps without GSAP tween collisions, and pause/resume guarantees.
 */
export class SimulationClock {
  constructor({ timeScale = 1.0, simulatedDays = 0.0, isPaused = false } = {}) {
    this._simulatedDays = simulatedDays;
    this.timeScale = timeScale;
    this.isPaused = isPaused;
    this.lastTimestamp = null;
    this.isLeaping = false; // When true during time jumps, frame loop preserves leap tween value
    this.daysPerSecond = 2.0; // Standard speed: 1 wall second = 2 simulated days at 1.0x scale
  }

  get simulatedDays() {
    return this._simulatedDays;
  }

  set simulatedDays(val) {
    this._simulatedDays = val;
  }

  update(timestampMs) {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestampMs;
      return 0;
    }

    const deltaSeconds = (timestampMs - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestampMs;

    // Safety clamp: if user switches tabs or window pauses, clamp delta to 0.1s max
    const clampedDelta = Math.min(Math.max(deltaSeconds, 0), 0.1);

    if (!this.isPaused && !this.isLeaping) {
      const daysStep = this.daysPerSecond * this.timeScale * clampedDelta;
      this._simulatedDays += daysStep;
      return daysStep;
    }

    return 0;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  startLeap() {
    this.isLeaping = true;
  }

  endLeap() {
    this.isLeaping = false;
  }

  reset() {
    this._simulatedDays = 0.0;
    this.isLeaping = false;
  }
}

/**
 * Solves Kepler's Equation M = E - e * sin(E) for Eccentric Anomaly E
 * using Newton-Raphson iteration.
 * @param {number} M - Mean Anomaly in radians
 * @param {number} e - Orbital eccentricity (0 <= e < 1)
 * @param {number} tolerance - Convergence threshold
 * @param {number} maxIter - Maximum iterations
 * @returns {number} Eccentric Anomaly E in radians
 */
export function solveKepler(M, e, tolerance = 1e-7, maxIter = 10) {
  let mNorm = M % (2 * Math.PI);
  if (mNorm < 0) mNorm += 2 * Math.PI;

  let E = mNorm + e * Math.sin(mNorm); // Initial estimate
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - mNorm;
    if (Math.abs(f) < tolerance) break;
    const fPrime = 1 - e * Math.cos(E);
    E = E - f / fPrime;
  }
  return E;
}

/**
 * Computes 3D Keplerian position with the central star at focus (0, 0, 0).
 * @param {number} a - Semi-major axis
 * @param {number} e - Eccentricity (0 <= e < 1)
 * @param {number} inclinationDeg - Orbital inclination in degrees
 * @param {number} orbitalPeriodDays - Orbital period in days
 * @param {number} simulatedDays - Current simulation epoch in days
 * @param {number} initialAngle - Initial phase angle / argument of periapsis
 * @returns {THREE.Vector3} 3D position vector
 */
export function calculateKeplerianPosition(a, e, inclinationDeg, orbitalPeriodDays, simulatedDays, initialAngle = 0) {
  const period = Math.max(orbitalPeriodDays, 0.1);
  const meanAnomaly = initialAngle + (2 * Math.PI * (simulatedDays / period));
  const E = solveKepler(meanAnomaly, e);
  
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  // Orbital plane coordinates with focus (Sun) at (0, 0, 0)
  const xOrb = a * (Math.cos(E) - e);
  const zOrb = b * Math.sin(E);
  
  // Rotate by orbital inclination around X axis
  const incRad = THREE.MathUtils.degToRad(inclinationDeg || 0);
  const y = zOrb * Math.sin(incRad);
  const z = zOrb * Math.cos(incRad);
  const x = xOrb;
  
  return new THREE.Vector3(x, y, z);
}
