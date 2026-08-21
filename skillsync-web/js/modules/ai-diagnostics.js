/**
 * AI Problem Diagnosis & Cost Estimator Engine
 * Features:
 * 1. Visual Defect Scanner with Bounding Box detection & Parts Breakdown
 * 2. Acoustic / Sound Frequency Waveform Analyzer
 * 3. Interactive Symptom Quiz Flow
 */

import { VISUAL_DIAGNOSTICS_PRESETS, ACOUSTIC_DIAGNOSTICS_PRESETS, SYMPTOM_CHECKER_NODES } from '../data/diagnostics-db.js';
import { SERVICE_CATEGORIES } from '../data/services.js';
import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class AiDiagnosticsModule {
  constructor(container) {
    this.container = container;
    this.activeMode = 'visual'; // 'visual' | 'acoustic' | 'symptom'
    this.selectedVisualPreset = VISUAL_DIAGNOSTICS_PRESETS[0];
    this.isScanning = false;
    this.activeAcousticPreset = ACOUSTIC_DIAGNOSTICS_PRESETS[0];
    this.isAudioPlaying = false;
    this.audioAnimFrame = null;
    this.currentSymptomNodeId = 'step-1';
  }

  render() {
    this.container.innerHTML = `
      <div class="ai-diagnostics-wrapper">
        <!-- Header Banner -->
        <div class="ai-hero-card">
          <div class="ai-hero-content">
            <div class="ai-badge-chip">
              <i data-lucide="sparkles"></i> <span>Neural Vision & Acoustic Engine v3.4</span>
            </div>
            <h2>AI Problem Diagnostics & Instant Repair Quotation</h2>
            <p>Don't guess the repair cost. Upload a photo or record appliance noise to let our multimodal AI detect the exact failure point, needed spare parts, and labor cost.</p>
          </div>

          <!-- Mode Switcher Tabs -->
          <div class="ai-mode-nav">
            <button class="ai-nav-tab ${this.activeMode === 'visual' ? 'active' : ''}" data-mode="visual">
              <i data-lucide="scan"></i>
              <span>Visual Defect Scanner</span>
            </button>
            <button class="ai-nav-tab ${this.activeMode === 'acoustic' ? 'active' : ''}" data-mode="acoustic">
              <i data-lucide="activity"></i>
              <span>Acoustic / Sound Analyzer</span>
            </button>
            <button class="ai-nav-tab ${this.activeMode === 'symptom' ? 'active' : ''}" data-mode="symptom">
              <i data-lucide="help-circle"></i>
              <span>Smart Symptom Checker</span>
            </button>
          </div>
        </div>

        <!-- Mode Content Containers -->
        <div class="ai-mode-container" id="ai-mode-content">
          <!-- Injected via renderActiveMode() -->
        </div>
      </div>
    `;

    this._bindHeroEvents();
    this.renderActiveMode();
    if (window.lucide) window.lucide.createIcons();
  }

  renderActiveMode() {
    const container = this.container.querySelector('#ai-mode-content');
    if (!container) return;

    if (this.activeMode === 'visual') {
      this._renderVisualScanner(container);
    } else if (this.activeMode === 'acoustic') {
      this._renderAcousticAnalyzer(container);
    } else {
      this._renderSymptomChecker(container);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // -------------------------------------------------------------
  // 1. VISUAL SCANNER SUB-VIEW
  // -------------------------------------------------------------
  _renderVisualScanner(container) {
    const preset = this.selectedVisualPreset;
    const partsTotal = preset.requiredParts.reduce((a, b) => a + b.cost, 0);
    const grandTotal = partsTotal + preset.laborEstimate;

    container.innerHTML = `
      <div class="visual-scanner-grid">
        <!-- Left Panel: Scanner Canvas / Image Preview -->
        <div class="scanner-preview-card">
          <div class="scanner-presets-bar">
            <span class="preset-label">Sample Presets:</span>
            <div class="preset-pill-group">
              ${VISUAL_DIAGNOSTICS_PRESETS.map((p, idx) => `
                <button class="preset-pill ${p.id === preset.id ? 'active' : ''}" data-preset-id="${p.id}">
                  ${p.category.toUpperCase()}: ${p.label.split('&')[0]}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Drag and Drop Image Box -->
          <div class="scanner-viewport-box ${this.isScanning ? 'is-scanning' : ''}" id="scanner-dropzone">
            <img src="${preset.sampleImage}" alt="${preset.label}" class="scanner-target-img" id="scanner-img" />
            
            <!-- Laser Scan Line Overlay -->
            <div class="scan-laser-line"></div>
            <div class="scan-grid-overlay"></div>

            <!-- Bounding Box Overlays -->
            ${!this.isScanning ? preset.boundingBoxes.map(box => `
              <div class="scanner-bounding-box" style="top:${box.top}; left:${box.left}; width:${box.width}; height:${box.height}; border-color:${box.color};">
                <span class="box-tag" style="background:${box.color};">
                  <i data-lucide="crosshair"></i> ${box.label}
                </span>
              </div>
            `).join('') : ''}

            <!-- Scan in Progress Overlay -->
            ${this.isScanning ? `
              <div class="scanning-loader-overlay">
                <div class="scanner-spinner"></div>
                <p>Neural Visual Analysis in Progress...</p>
                <span class="scan-step-hint">Extracting texture anomalies & thermal contours</span>
              </div>
            ` : ''}
          </div>

          <!-- Upload / Scan Action Bar -->
          <div class="scanner-controls-bar">
            <label class="btn btn-secondary upload-btn">
              <i data-lucide="upload-cloud"></i>
              <span>Upload Custom Photo</span>
              <input type="file" id="custom-photo-upload" accept="image/*" style="display: none;" />
            </label>
            <button class="btn btn-primary" id="btn-re-scan">
              <i data-lucide="scan-line"></i>
              <span>${this.isScanning ? 'Scanning...' : 'Re-Run Neural Scan'}</span>
            </button>
          </div>
        </div>

        <!-- Right Panel: AI Diagnostic Report & Cost Breakdown -->
        <div class="scanner-report-card">
          <div class="report-header">
            <div class="report-title-group">
              <div class="severity-tag severity-${preset.severity.toLowerCase()}">
                <i data-lucide="alert-triangle"></i> Severity: ${preset.severity}
              </div>
              <span class="confidence-badge">
                <i data-lucide="check-circle-2"></i> ${preset.confidence}% Match
              </span>
            </div>
            <h3 class="detected-issue-title">${preset.detectedIssue}</h3>
          </div>

          <div class="report-body">
            <div class="report-section">
              <h4><i data-lucide="microscope"></i> AI Forensic Diagnosis</h4>
              <p class="diagnosis-summary-text">${preset.diagnosisSummary}</p>
            </div>

            <div class="safety-alert-box">
              <i data-lucide="shield-alert"></i>
              <div>
                <strong>Safety Precaution:</strong>
                <span>${preset.safetyWarning}</span>
              </div>
            </div>

            <!-- Required Spare Parts Table -->
            <div class="report-section">
              <h4><i data-lucide="cpu"></i> Verified Replacement Parts</h4>
              <div class="parts-list-table">
                ${preset.requiredParts.map(part => `
                  <div class="part-item-row">
                    <span class="part-name"><i data-lucide="check"></i> ${part.name}</span>
                    <span class="part-cost">₹${part.cost}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Quotation Estimate Box -->
            <div class="quotation-summary-box">
              <div class="quote-row">
                <span>Parts & Hardware Subtotal</span>
                <span>₹${partsTotal}</span>
              </div>
              <div class="quote-row">
                <span>Certified Technician Labor (~${preset.estimatedDurationMinutes} mins)</span>
                <span>₹${preset.laborEstimate}</span>
              </div>
              <div class="quote-divider"></div>
              <div class="quote-row quote-grand-total">
                <div>
                  <strong>Total Estimated Cost</strong>
                  <small>No hidden charges, 30-day warranty</small>
                </div>
                <div class="price-value">₹${grandTotal}</div>
              </div>
            </div>
          </div>

          <!-- Direct 1-Click Booking Action -->
          <div class="report-footer">
            <button class="btn btn-primary btn-block btn-lg" id="btn-book-with-report">
              <i data-lucide="calendar-check"></i>
              <span>Book Technician with this AI Report</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this._bindVisualEvents(container);
  }

  // -------------------------------------------------------------
  // 2. ACOUSTIC ANALYZER SUB-VIEW
  // -------------------------------------------------------------
  _renderAcousticAnalyzer(container) {
    const preset = this.activeAcousticPreset;

    container.innerHTML = `
      <div class="acoustic-analyzer-grid">
        <div class="acoustic-card">
          <div class="acoustic-header">
            <div>
              <span class="badge-accent"><i data-lucide="volume-2"></i> Acoustic Spectrum Analyzer</span>
              <h3>Appliance Mechanical Sound Diagnosis</h3>
              <p>Listen or simulate noise signatures to diagnose failing motor bearings, gas cavitation, or loose belts without opening the appliance.</p>
            </div>
          </div>

          <!-- Acoustic Presets Selector -->
          <div class="acoustic-presets-picker">
            ${ACOUSTIC_DIAGNOSTICS_PRESETS.map(p => `
              <div class="acoustic-preset-card ${p.id === preset.id ? 'active' : ''}" data-acoustic-id="${p.id}">
                <div class="p-icon"><i data-lucide="activity"></i></div>
                <div class="p-info">
                  <strong>${p.name}</strong>
                  <span>${p.sourceAppliance} • ${p.frequencyPeak}</span>
                </div>
                <button class="play-audio-btn">
                  <i data-lucide="${this.isAudioPlaying && p.id === preset.id ? 'pause' : 'play'}"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Canvas Waveform Visualizer -->
          <div class="waveform-canvas-box">
            <canvas id="waveform-canvas" width="680" height="160"></canvas>
            <div class="spectrum-meter-overlay">
              <span>Peak Harmonic: <strong>${preset.frequencyPeak}</strong></span>
              <span>Confidence: <strong>${preset.confidence}%</strong></span>
            </div>
          </div>

          <!-- Acoustic Diagnosis Output -->
          <div class="acoustic-result-box">
            <div class="res-head">
              <span class="severity-tag severity-${preset.severity.toLowerCase()}">${preset.severity} Priority</span>
              <h4>Detected Fault: ${preset.detectedIssue}</h4>
            </div>
            <p class="res-desc">${preset.repairRecommendation}</p>
            
            <div class="res-footer-bar">
              <div class="est-tag">Estimated Fix: <strong>₹${preset.estimatedCost}</strong></div>
              <button class="btn btn-primary" id="btn-book-acoustic-fix">
                <i data-lucide="wrench"></i> Book Expert for this Sound Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindAcousticEvents(container);
    this._drawWaveformCanvas();
  }

  // -------------------------------------------------------------
  // 3. SMART SYMPTOM CHECKER SUB-VIEW
  // -------------------------------------------------------------
  _renderSymptomChecker(container) {
    const currentNode = SYMPTOM_CHECKER_NODES.find(n => n.id === this.currentSymptomNodeId) || SYMPTOM_CHECKER_NODES[0];

    container.innerHTML = `
      <div class="symptom-quiz-container">
        <div class="symptom-card">
          <div class="quiz-progress-bar">
            <div class="quiz-step-dot active">1</div>
            <div class="quiz-line"></div>
            <div class="quiz-step-dot ${this.currentSymptomNodeId !== 'step-1' ? 'active' : ''}">2</div>
            <div class="quiz-line"></div>
            <div class="quiz-step-dot">3</div>
          </div>

          <div class="quiz-content">
            <div class="quiz-question-badge"><i data-lucide="help-circle"></i> Guided Troubleshooting</div>
            <h3 class="quiz-question-title">${currentNode.question}</h3>
            
            <div class="quiz-options-list">
              ${currentNode.options.map((opt, i) => `
                <button class="quiz-option-btn" data-index="${i}">
                  <span class="opt-num">${String.fromCharCode(65 + i)}</span>
                  <span class="opt-text">${opt.text}</span>
                  <i data-lucide="chevron-right"></i>
                </button>
              `).join('')}
            </div>

            ${this.currentSymptomNodeId !== 'step-1' ? `
              <div class="quiz-nav-back">
                <button class="btn btn-ghost" id="btn-quiz-restart">
                  <i data-lucide="rotate-ccw"></i> Start Over
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this._bindSymptomEvents(container, currentNode);
  }

  // -------------------------------------------------------------
  // EVENT BINDINGS
  // -------------------------------------------------------------
  _bindHeroEvents() {
    this.container.querySelectorAll('.ai-nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = tab.getAttribute('data-mode');
        if (mode && mode !== this.activeMode) {
          this.activeMode = mode;
          soundFx.playTap();
          this.render();
        }
      });
    });
  }

  _bindVisualEvents(container) {
    // Preset pill click
    container.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const id = pill.getAttribute('data-preset-id');
        const match = VISUAL_DIAGNOSTICS_PRESETS.find(p => p.id === id);
        if (match) {
          this.selectedVisualPreset = match;
          soundFx.playTap();
          this._triggerScanAnimation();
        }
      });
    });

    // Re-scan button
    const reScanBtn = container.querySelector('#btn-re-scan');
    if (reScanBtn) {
      reScanBtn.addEventListener('click', () => {
        this._triggerScanAnimation();
      });
    }

    // Custom Photo Upload
    const photoInput = container.querySelector('#custom-photo-upload');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.selectedVisualPreset = {
              ...this.selectedVisualPreset,
              id: 'custom-upload-' + Date.now(),
              label: 'Custom User Uploaded Image',
              sampleImage: event.target.result,
              confidence: 96.8
            };
            this._triggerScanAnimation();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Book Technician with Report Button
    const bookBtn = container.querySelector('#btn-book-with-report');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        const preset = this.selectedVisualPreset;
        appState.setActiveDiagnostic(preset);
        soundFx.playSuccess();
        
        // Find matching service in catalog
        let targetService = null;
        for (const cat of SERVICE_CATEGORIES) {
          const found = cat.services.find(s => s.id === preset.matchedServiceId);
          if (found) {
            targetService = { ...found, category: cat.id };
            break;
          }
        }
        if (!targetService) {
          targetService = { ...SERVICE_CATEGORIES[0].services[0], category: 'plumbing' };
        }

        // Open booking wizard directly with attached AI report!
        if (window.skillsyncApp && window.skillsyncApp.bookingWizard) {
          window.skillsyncApp.bookingWizard.openModal(targetService, preset);
        }
      });
    }
  }

  _triggerScanAnimation() {
    this.isScanning = true;
    soundFx.playScannerBeep();
    this.renderActiveMode();

    setTimeout(() => {
      soundFx.playScannerBeep();
    }, 400);

    setTimeout(() => {
      this.isScanning = false;
      soundFx.playSuccess();
      this.renderActiveMode();
    }, 1200);
  }

  _bindAcousticEvents(container) {
    container.querySelectorAll('.acoustic-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-acoustic-id');
        const match = ACOUSTIC_DIAGNOSTICS_PRESETS.find(p => p.id === id);
        if (match) {
          this.activeAcousticPreset = match;
          this.isAudioPlaying = !this.isAudioPlaying;
          if (this.isAudioPlaying) {
            soundFx.playRadarPing();
          }
          this._renderAcousticAnalyzer(container);
        }
      });
    });

    const bookAcousticBtn = container.querySelector('#btn-book-acoustic-fix');
    if (bookAcousticBtn) {
      bookAcousticBtn.addEventListener('click', () => {
        const preset = this.activeAcousticPreset;
        let targetService = null;
        for (const cat of SERVICE_CATEGORIES) {
          const found = cat.services.find(s => s.id === preset.matchedServiceId);
          if (found) {
            targetService = { ...found, category: cat.id };
            break;
          }
        }
        if (!targetService) {
          targetService = { ...SERVICE_CATEGORIES[0].services[0], category: 'plumbing' };
        }

        const report = {
          label: preset.name,
          detectedIssue: preset.detectedIssue,
          severity: preset.severity,
          confidence: preset.confidence,
          requiredParts: [{ name: "Acoustic Mechanical Calibration & Replacement", cost: preset.estimatedCost - targetService.basePrice }],
          laborEstimate: targetService.basePrice,
          matchedServiceId: targetService.id
        };

        appState.setActiveDiagnostic(report);
        if (window.skillsyncApp && window.skillsyncApp.bookingWizard) {
          window.skillsyncApp.bookingWizard.openModal(targetService, report);
        }
      });
    }
  }

  _drawWaveformCanvas() {
    const canvas = this.container.querySelector('#waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wave = this.activeAcousticPreset.waveformData;

    let offset = 0;
    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Dynamic Frequency Bars
      const numBars = 36;
      const barWidth = (canvas.width / numBars) - 4;

      for (let i = 0; i < numBars; i++) {
        const baseHeight = wave[i % wave.length] || 40;
        const dynamicFactor = this.isAudioPlaying ? Math.sin(offset + i * 0.4) * 20 : 0;
        const barHeight = Math.max(10, Math.min(130, (baseHeight + dynamicFactor) * (canvas.height / 150)));

        const x = i * (barWidth + 4) + 2;
        const y = canvas.height - barHeight;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
        grad.addColorStop(0, '#3B82F6');
        grad.addColorStop(0.5, '#60A5FA');
        grad.addColorStop(1, 'rgba(37, 99, 235, 0.2)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }

      if (this.isAudioPlaying) {
        offset += 0.15;
        this.audioAnimFrame = requestAnimationFrame(renderWave);
      }
    };

    renderWave();
  }

  _bindSymptomEvents(container, currentNode) {
    container.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const opt = currentNode.options[idx];
        soundFx.playTap();

        if (opt.next) {
          this.currentSymptomNodeId = opt.next;
          this.renderActiveMode();
        } else if (opt.resultPreset) {
          const match = VISUAL_DIAGNOSTICS_PRESETS.find(p => p.id === opt.resultPreset);
          if (match) {
            this.selectedVisualPreset = match;
            this.activeMode = 'visual';
            this.render();
            this._triggerScanAnimation();
          }
        } else if (opt.serviceId) {
          let targetService = null;
          for (const cat of SERVICE_CATEGORIES) {
            const found = cat.services.find(s => s.id === opt.serviceId);
            if (found) {
              targetService = { ...found, category: cat.id };
              break;
            }
          }
          if (targetService && window.skillsyncApp && window.skillsyncApp.bookingWizard) {
            window.skillsyncApp.bookingWizard.openModal(targetService);
          }
        }
      });
    });

    const restartBtn = container.querySelector('#btn-quiz-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.currentSymptomNodeId = 'step-1';
        soundFx.playTap();
        this.renderActiveMode();
      });
    }
  }
}
