/**
 * Live Service Tracker Module
 * Interactive SVG/Canvas GPS Route Map, Safety OTP, Timeline, and Technician Communication
 */

import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class LiveTrackerModule {
  constructor(container) {
    this.container = container;
    this.ratingScore = 5;
    this.reviewText = "";
    this.selectedTip = 50;
  }

  render() {
    const state = appState.getState();
    const booking = state.activeBooking;

    if (!booking) {
      this.container.innerHTML = `
        <div class="empty-tracker-card">
          <div class="empty-icon-circle">
            <i data-lucide="navigation"></i>
          </div>
          <h3>No Active Service in Progress</h3>
          <p>Book an expert technician or run an AI problem diagnostic to track live service arrival.</p>
          <div class="empty-actions-row">
            <button class="btn btn-primary" id="btn-tracker-explore">
              <i data-lucide="search"></i> Explore Services
            </button>
            <button class="btn btn-secondary" id="btn-tracker-ai">
              <i data-lucide="sparkles"></i> Diagnose with AI
            </button>
          </div>
        </div>
      `;
      this._bindEmptyEvents();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const tech = booking.technician;
    const isCompleted = booking.status === 'completed';

    this.container.innerHTML = `
      <div class="live-tracker-wrapper">
        <!-- Top Status Bar & Emergency SOS Trigger -->
        <div class="tracker-top-bar">
          <div class="booking-meta-chip">
            <span class="booking-id-tag">Job #${booking.id}</span>
            <span class="status-pill status-${booking.status}">
              ${this._formatStatusLabel(booking.status)}
            </span>
          </div>

          <div class="top-bar-actions">
            <button class="btn btn-danger-sos" id="btn-trigger-sos-top">
              <i data-lucide="shield-alert"></i>
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>

        <!-- Main Tracking Split Grid -->
        <div class="tracker-main-grid">
          <!-- Left Column: Interactive GPS Map View -->
          <div class="tracker-map-panel">
            <div class="map-container-box" id="gps-map-box">
              <svg class="interactive-gps-svg" viewBox="0 0 800 500" preserveAspectRatio="none">
                <!-- Map Street Grid Background -->
                <defs>
                  <pattern id="street-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                    <rect width="80" height="80" fill="#1E293B" />
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#334155" stroke-width="2" />
                    <path d="M 40 0 L 40 80 M 0 40 L 80 40" fill="none" stroke="#233248" stroke-width="1" />
                  </pattern>
                  <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3B82F6" />
                    <stop offset="100%" stop-color="#10B981" />
                  </linearGradient>
                </defs>

                <rect width="100%" height="100%" fill="url(#street-grid)" />

                <!-- Road Network -->
                <path d="M 50 380 Q 250 420, 380 280 T 640 150" fill="none" stroke="#475569" stroke-width="18" stroke-linecap="round" />
                <path d="M 50 380 Q 250 420, 380 280 T 640 150" fill="none" stroke="#64748B" stroke-width="12" stroke-linecap="round" />
                <path d="M 50 380 Q 250 420, 380 280 T 640 150" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6,6" />

                <!-- Destination / Customer Home Pin -->
                <g transform="translate(640, 150)">
                  <circle r="36" fill="rgba(16, 185, 129, 0.2)" class="pulse-ring" />
                  <circle r="22" fill="#10B981" />
                  <circle r="8" fill="#FFFFFF" />
                  <text y="42" text-anchor="middle" fill="#E2E8F0" font-size="13" font-weight="600">Your Home</text>
                </g>

                <!-- Moving Technician Pin -->
                <g id="tech-gps-marker" transform="translate(${booking.techCoord.x * 7.5 + 40}, ${booking.techCoord.y * 4.2 + 40})">
                  <circle r="32" fill="rgba(59, 130, 246, 0.3)" class="radar-pulse-ring" />
                  <circle r="20" fill="#2563EB" stroke="#FFFFFF" stroke-width="3" />
                  <text y="5" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="bold">🛵</text>
                  <text y="38" text-anchor="middle" fill="#60A5FA" font-size="12" font-weight="bold">${tech.name.split(' ')[0]}</text>
                </g>
              </svg>

              <!-- Floating ETA Card on Map -->
              <div class="map-floating-eta-card">
                <div class="eta-icon"><i data-lucide="clock"></i></div>
                <div class="eta-info">
                  <span class="eta-label">${booking.status === 'arrived' ? 'Technician at Door' : 'Estimated Arrival'}</span>
                  <strong class="eta-time">${booking.status === 'arrived' ? 'ARRIVED' : `${booking.etaMinutes} mins`}</strong>
                </div>
                <span class="eta-distance">${booking.currentDistanceKm} km away</span>
              </div>
            </div>

            <!-- Prominent Safety OTP Box -->
            <div class="safety-otp-card">
              <div class="otp-instruction-block">
                <div class="otp-shield-icon"><i data-lucide="lock"></i></div>
                <div>
                  <h4>Start Service Safety OTP</h4>
                  <p>Share this 4-digit code with ${tech.name} upon arrival to unlock and start service.</p>
                </div>
              </div>
              <div class="otp-number-display">
                <span class="otp-digit">${booking.otp[0] || '4'}</span>
                <span class="otp-digit">${booking.otp[1] || '9'}</span>
                <span class="otp-digit">${booking.otp[2] || '2'}</span>
                <span class="otp-digit">${booking.otp[3] || '1'}</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Technician Profile & Service Timeline -->
          <div class="tracker-details-panel">
            <!-- Technician Profile Card -->
            <div class="assigned-tech-card">
              <div class="tech-header-line">
                <img src="${tech.avatar}" alt="${tech.name}" class="tech-avatar-lg" />
                <div class="tech-info-col">
                  <div class="tech-name-row">
                    <h3>${tech.name}</h3>
                    <span class="tech-verified-badge"><i data-lucide="check-circle-2"></i> Verified</span>
                  </div>
                  <span class="tech-specialty-text">${tech.specialty}</span>
                  <div class="tech-ratings-badge">
                    <span><i data-lucide="star"></i> ${tech.rating}</span>
                    <span class="dot-sep">•</span>
                    <span>${tech.jobsCompleted}+ jobs completed</span>
                  </div>
                  <div class="tech-vehicle-text">
                    <i data-lucide="bike"></i> ${tech.vehicle}
                  </div>
                </div>
              </div>

              <!-- Quick Communication Actions -->
              <div class="tech-contact-bar">
                <a href="tel:${tech.phone}" class="btn btn-secondary contact-btn">
                  <i data-lucide="phone"></i> Call Partner
                </a>
                <button class="btn btn-secondary contact-btn" id="btn-message-tech">
                  <i data-lucide="message-square"></i> Send Note
                </button>
              </div>
            </div>

            <!-- Real-Time Service Status Stepper -->
            <div class="service-stepper-card">
              <h4>Service Progress Timeline</h4>
              
              <div class="live-timeline">
                ${booking.timeline.map((step, idx) => `
                  <div class="timeline-step ${step.done ? 'step-done' : ''} ${booking.status === step.status ? 'step-current' : ''}">
                    <div class="step-bullet">
                      <i data-lucide="${step.done ? 'check' : 'circle'}"></i>
                    </div>
                    <div class="step-content">
                      <div class="step-title-row">
                        <strong>${step.label}</strong>
                        <span class="step-time">${step.time}</span>
                      </div>
                      <p class="step-desc">${this._getTimelineDescription(step.status)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Itemized Bill Summary -->
            <div class="service-bill-card">
              <div class="bill-header">
                <h4><i data-lucide="receipt"></i> Current Invoice</h4>
                <span class="bill-status">Paid via Online</span>
              </div>
              
              <div class="bill-rows">
                <div class="bill-row">
                  <span>${booking.serviceTitle}</span>
                  <span>₹${booking.basePrice}</span>
                </div>
                ${booking.partsTotal > 0 ? `
                  <div class="bill-row">
                    <span>AI Diagnostic Spare Parts</span>
                    <span>₹${booking.partsTotal}</span>
                  </div>
                ` : ''}
                ${(booking.extraCharges || []).map(ch => `
                  <div class="bill-row extra-charge-row">
                    <span>+ ${ch.name}</span>
                    <span>₹${ch.amount}</span>
                  </div>
                `).join('')}
                <div class="bill-divider"></div>
                <div class="bill-row bill-grand-total">
                  <strong>Total Amount</strong>
                  <strong class="total-val">₹${booking.totalAmount}</strong>
                </div>
              </div>
            </div>

            <!-- Post Service Completion Review Card (if completed) -->
            ${isCompleted ? `
              <div class="rating-review-card">
                <div class="rating-header">
                  <i data-lucide="party-popper"></i>
                  <h4>Rate Your Service Experience</h4>
                </div>
                <p>How was your experience with ${tech.name}?</p>

                <div class="star-rating-selector">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button class="star-btn ${star <= this.ratingScore ? 'selected' : ''}" data-star="${star}">
                      <i data-lucide="star"></i>
                    </button>
                  `).join('')}
                </div>

                <div class="tip-selector-row">
                  <span>Add Tip:</span>
                  ${[30, 50, 100].map(tip => `
                    <button class="tip-chip ${this.selectedTip === tip ? 'active' : ''}" data-tip="${tip}">
                      +₹${tip}
                    </button>
                  `).join('')}
                </div>

                <textarea class="form-textarea review-textarea" id="customer-review-input" placeholder="Leave a review for ${tech.name}...">${this.reviewText}</textarea>
                
                <button class="btn btn-primary btn-block" id="btn-submit-review">
                  <i data-lucide="send"></i> Submit Feedback & Rating
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this._bindEvents(booking);
    if (window.lucide) window.lucide.createIcons();
  }

  _formatStatusLabel(status) {
    const map = {
      'assigned': 'Technician Assigned',
      'en_route': 'Technician On The Way',
      'arrived': 'At Your Doorstep',
      'in_progress': 'Repair In Progress',
      'completed': 'Service Completed'
    };
    return map[status] || status;
  }

  _getTimelineDescription(status) {
    const map = {
      'assigned': 'Technician has accepted your booking and prepared tools.',
      'en_route': 'Technician is navigating via shortest GPS route.',
      'arrived': 'Technician is at your gate. Please share safety OTP.',
      'in_progress': 'Technician is actively fixing and testing equipment.',
      'completed': 'Job completed with 30-day post-service warranty.'
    };
    return map[status] || '';
  }

  _bindEmptyEvents() {
    const exploreBtn = this.container.querySelector('#btn-tracker-explore');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        appState.setTab('home');
      });
    }

    const aiBtn = this.container.querySelector('#btn-tracker-ai');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        appState.setTab('ai-diagnostics');
      });
    }
  }

  _bindEvents(booking) {
    // SOS button top trigger
    const sosBtn = this.container.querySelector('#btn-trigger-sos-top');
    if (sosBtn) {
      sosBtn.addEventListener('click', () => {
        appState.triggerSOS();
      });
    }

    // Send Note message
    const msgBtn = this.container.querySelector('#btn-message-tech');
    if (msgBtn) {
      msgBtn.addEventListener('click', () => {
        const note = prompt("Send quick message to technician:", "Please ring the bell when outside.");
        if (note) {
          soundFx.playSuccess();
          appState.addToast(`Message sent to ${booking.technician.name}: "${note}"`, "success");
        }
      });
    }

    // Rating star clicks
    this.container.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const star = parseInt(btn.getAttribute('data-star'), 10);
        this.ratingScore = star;
        soundFx.playTap();
        this.render();
      });
    });

    // Tip chips
    this.container.querySelectorAll('.tip-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tip = parseInt(chip.getAttribute('data-tip'), 10);
        this.selectedTip = tip;
        soundFx.playTap();
        this.render();
      });
    });

    // Review submit
    const submitReviewBtn = this.container.querySelector('#btn-submit-review');
    if (submitReviewBtn) {
      submitReviewBtn.addEventListener('click', () => {
        const textarea = this.container.querySelector('#customer-review-input');
        const text = textarea ? textarea.value.trim() : "";
        appState.submitRating(booking.id, this.ratingScore, text);
        this.reviewText = "";
      });
    }
  }
}
