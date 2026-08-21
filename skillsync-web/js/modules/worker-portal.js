/**
 * Technician / Partner Operational Portal Module
 * Online/Offline Dispatch Radar, Incoming Dispatch Alert with 30s Timer, OTP Service Verification & Extra Billing
 */

import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class WorkerPortalModule {
  constructor(container) {
    this.container = container;
    this.enteredOtp = '';
    this.incomingCountdownTimer = null;
    this.countdownSeconds = 30;
  }

  render() {
    const state = appState.getState();
    const worker = state.worker;
    const activeBooking = state.activeBooking;
    const incomingReq = state.activeIncomingRequest;

    this.container.innerHTML = `
      <div class="worker-portal-wrapper">
        <!-- Worker Header Card with Online / Offline Toggle -->
        <div class="worker-header-card">
          <div class="worker-profile-summary">
            <img src="${worker.avatar}" alt="${worker.name}" class="worker-avatar-thumb" />
            <div class="worker-info-meta">
              <div class="worker-name-line">
                <h2>${worker.name}</h2>
                <span class="pro-tag">${worker.badge}</span>
              </div>
              <span class="worker-spec">${worker.specialty}</span>
              <div class="worker-stat-chips">
                <span class="chip"><i data-lucide="star"></i> ${worker.rating} Rating</span>
                <span class="chip"><i data-lucide="check-circle-2"></i> ${worker.totalCompletedJobs} Total Jobs</span>
                <span class="chip"><i data-lucide="trending-up"></i> ${worker.acceptanceRate}% Acceptance</span>
              </div>
            </div>
          </div>

          <!-- Master Online / Offline Switch -->
          <div class="worker-status-toggle-box">
            <span class="status-indicator-dot ${worker.isOnline ? 'online' : 'offline'}"></span>
            <div class="status-text-block">
              <strong>${worker.isOnline ? 'ONLINE & DISPATCH READY' : 'OFFLINE'}</strong>
              <small>${worker.isOnline ? 'Receiving priority local requests' : 'Toggle to start receiving jobs'}</small>
            </div>

            <label class="switch-toggle-btn">
              <input type="checkbox" id="worker-online-toggle" ${worker.isOnline ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Metric KPI Cards Grid -->
        <div class="worker-kpi-grid">
          <div class="kpi-card earnings-kpi">
            <div class="kpi-icon-box"><i data-lucide="wallet"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Today's Earnings</span>
              <h3 class="kpi-value">₹${worker.todayEarnings}</h3>
              <span class="kpi-subtext positive">+₹650 from yesterday</span>
            </div>
          </div>

          <div class="kpi-card jobs-kpi">
            <div class="kpi-icon-box"><i data-lucide="briefcase"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Jobs Completed Today</span>
              <h3 class="kpi-value">${worker.completedJobsToday}</h3>
              <span class="kpi-subtext">Target: 6 jobs/day</span>
            </div>
          </div>

          <div class="kpi-card weekly-kpi">
            <div class="kpi-icon-box"><i data-lucide="calendar"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">This Week Payout</span>
              <h3 class="kpi-value">₹${worker.weeklyEarnings}</h3>
              <span class="kpi-subtext">Auto-transfers every Monday</span>
            </div>
          </div>

          <div class="kpi-card rating-kpi">
            <div class="kpi-icon-box"><i data-lucide="award"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Partner Level</span>
              <h3 class="kpi-value">Tier 1 Platinum</h3>
              <span class="kpi-subtext">Top 5% performer</span>
            </div>
          </div>
        </div>

        <!-- Incoming Job Dispatch Alert (Modal / Banner if Active) -->
        ${incomingReq && worker.isOnline ? this._renderIncomingRequestAlert(incomingReq) : ''}

        <!-- Active Assigned Job Operations Panel -->
        ${activeBooking && activeBooking.status !== 'completed' ? `
          <div class="worker-active-job-card">
            <div class="active-job-top-bar">
              <div class="job-status-badge">
                <span class="pulse-dot"></span>
                <span>Active Service: #${activeBooking.id}</span>
              </div>
              <span class="job-stage-tag stage-${activeBooking.status}">${this._getStageLabel(activeBooking.status)}</span>
            </div>

            <div class="job-body-grid">
              <!-- Customer & Service Overview -->
              <div class="job-customer-details">
                <h3 class="job-service-name">${activeBooking.serviceTitle}</h3>
                
                <div class="cust-info-row">
                  <div class="cust-avatar-circle">${state.customer.name[0]}</div>
                  <div>
                    <strong>${state.customer.name}</strong>
                    <span>${state.customer.phone}</span>
                  </div>
                </div>

                <div class="job-location-box">
                  <i data-lucide="map-pin"></i>
                  <div>
                    <strong>Service Address:</strong>
                    <p>${activeBooking.address.fullAddress}</p>
                  </div>
                </div>

                ${activeBooking.notes ? `
                  <div class="job-notes-box">
                    <i data-lucide="message-square"></i>
                    <span><strong>Customer Note:</strong> "${activeBooking.notes}"</span>
                  </div>
                ` : ''}

                ${activeBooking.aiReport ? `
                  <div class="worker-ai-brief-card">
                    <div class="ai-brief-head">
                      <i data-lucide="sparkles"></i> <strong>AI Pre-Diagnosis Report</strong>
                    </div>
                    <p>${activeBooking.aiReport.diagnosisSummary}</p>
                    <div class="required-parts-tags">
                      ${activeBooking.aiReport.requiredParts.map(p => `<span class="part-pill">${p.name} (₹${p.cost})</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Workflow Actions & OTP Gate -->
              <div class="job-action-console">
                <div class="payout-highlight-card">
                  <span>Your Net Payout (82%)</span>
                  <strong class="payout-amt">₹${Math.round(activeBooking.totalAmount * 0.82)}</strong>
                  <small>Base labor + approved parts commission</small>
                </div>

                <!-- Step-dependent Operational Buttons -->
                ${this._renderWorkerJobControls(activeBooking)}
              </div>
            </div>
          </div>
        ` : `
          <!-- No Active Job Placeholder / Radar View -->
          <div class="worker-idle-radar-card">
            <div class="radar-sweep-circle">
              <div class="radar-line"></div>
              <i data-lucide="radio" class="radar-center-icon"></i>
            </div>
            <h3>${worker.isOnline ? 'Scanning for Nearby Service Requests...' : 'You are currently Offline'}</h3>
            <p>${worker.isOnline ? 'Keep the app open. Dispatch matches within 5km radius will ring automatically.' : 'Go Online using the top toggle to start receiving customer jobs.'}</p>
            
            ${worker.isOnline && !activeBooking ? `
              <button class="btn btn-secondary" id="btn-simulate-dispatch">
                <i data-lucide="bell-ring"></i> Simulate Incoming Job Dispatch
              </button>
            ` : ''}
          </div>
        `}
      </div>
    `;

    this._bindEvents(activeBooking);
    if (window.lucide) window.lucide.createIcons();
  }

  _renderIncomingRequestAlert(req) {
    return `
      <div class="incoming-dispatch-banner">
        <div class="dispatch-alert-header">
          <div class="alert-pulse-icon"><i data-lucide="bell-ring"></i></div>
          <div class="alert-title-block">
            <h3>New Service Request Received!</h3>
            <span>Auto-expires in <strong id="countdown-timer-text">${this.countdownSeconds}s</strong></span>
          </div>
        </div>

        <div class="dispatch-summary-row">
          <div class="d-item">
            <span class="d-label">Service</span>
            <strong>${req.serviceTitle}</strong>
          </div>
          <div class="d-item">
            <span class="d-label">Distance</span>
            <strong>${req.distanceKm}</strong>
          </div>
          <div class="d-item">
            <span class="d-label">Estimated Payout</span>
            <strong class="payout-green">₹${req.payoutAmount}</strong>
          </div>
        </div>

        <div class="dispatch-actions">
          <button class="btn btn-danger" id="btn-decline-job">
            <i data-lucide="x"></i> Decline
          </button>
          <button class="btn btn-success btn-lg" id="btn-accept-job">
            <i data-lucide="check"></i> Accept Job
          </button>
        </div>
      </div>
    `;
  }

  _renderWorkerJobControls(booking) {
    if (booking.status === 'assigned') {
      return `
        <div class="stage-control-group">
          <p class="stage-prompt">You have accepted this job. Start moving towards customer location.</p>
          <button class="btn btn-primary btn-block btn-lg" id="btn-worker-start-travel">
            <i data-lucide="navigation"></i> Start Navigation (Go En Route)
          </button>
        </div>
      `;
    }

    if (booking.status === 'en_route') {
      return `
        <div class="stage-control-group">
          <p class="stage-prompt">Navigating to customer location. Tap below when you reach doorstep.</p>
          <button class="btn btn-primary btn-block btn-lg" id="btn-worker-mark-arrived">
            <i data-lucide="map-pin"></i> I Have Arrived at Doorstep
          </button>
        </div>
      `;
    }

    if (booking.status === 'arrived') {
      return `
        <div class="stage-control-group otp-verification-group">
          <h4><i data-lucide="lock"></i> Enter Customer's 4-Digit OTP</h4>
          <p class="stage-prompt">Ask customer for the 4-digit code shown on their tracking screen to start service.</p>
          
          <div class="otp-input-row">
            <input type="text" maxlength="4" id="worker-otp-input" placeholder="e.g. 4921" class="form-input otp-large-field" />
            <button class="btn btn-success" id="btn-worker-verify-otp">
              <i data-lucide="unlock"></i> Verify OTP & Start Job
            </button>
          </div>
          <small class="otp-help-text">Correct OTP for demo: <strong>${booking.otp}</strong></small>
        </div>
      `;
    }

    if (booking.status === 'in_progress') {
      return `
        <div class="stage-control-group in-progress-group">
          <div class="in-progress-badge">
            <i data-lucide="wrench"></i> Service in Progress
          </div>

          <!-- Add Spare Parts / Extra Charge Button -->
          <div class="extra-billing-section">
            <h5>Add Replacement Hardware / Extra Work</h5>
            <div class="extra-item-form">
              <input type="text" id="extra-part-name" placeholder="Part name (e.g. Capacitor 50uF)" class="form-input" />
              <input type="number" id="extra-part-cost" placeholder="Cost (₹)" class="form-input cost-input" />
              <button class="btn btn-secondary" id="btn-add-extra-charge">
                <i data-lucide="plus"></i> Add to Bill
              </button>
            </div>
          </div>

          <!-- Complete Job Button -->
          <button class="btn btn-success btn-block btn-lg" id="btn-worker-complete-job">
            <i data-lucide="check-circle"></i> Mark Service as Completed
          </button>
        </div>
      `;
    }

    return `<div>Service Completed</div>`;
  }

  _getStageLabel(status) {
    const map = {
      'assigned': 'Assigned - Travel Pending',
      'en_route': 'En Route to Location',
      'arrived': 'Arrived - OTP Verification',
      'in_progress': 'Repair in Progress',
      'completed': 'Job Completed'
    };
    return map[status] || status;
  }

  _bindEvents(activeBooking) {
    const state = appState.getState();

    // Online / Offline toggle
    const toggle = this.container.querySelector('#worker-online-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        appState.setWorkerOnline(e.target.checked);
      });
    }

    // Simulate dispatch button
    const simBtn = this.container.querySelector('#btn-simulate-dispatch');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        soundFx.playIncomingJobAlert();
        appState.state.activeIncomingRequest = {
          bookingId: "SS-DEMO",
          serviceTitle: "MCB Tripping & Short Circuit Fix",
          customerName: "Pooja Verma",
          customerPhone: "+91 98112 00445",
          address: "Sector 18, Block C, Noida",
          distanceKm: "1.8 km away",
          payoutAmount: 320
        };
        appState.notify('simulated_dispatch');
      });
    }

    // Accept Job
    const acceptBtn = this.container.querySelector('#btn-accept-job');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        soundFx.playSuccess();
        appState.state.activeIncomingRequest = null;
        if (activeBooking) {
          appState.updateBookingStatus(activeBooking.id, 'en_route');
        }
        appState.addToast("Job accepted! Safe travels.", "success");
        this.render();
      });
    }

    // Decline Job
    const declineBtn = this.container.querySelector('#btn-decline-job');
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        soundFx.playTap();
        appState.state.activeIncomingRequest = null;
        appState.addToast("Job declined. You remain online for next request.", "info");
        this.render();
      });
    }

    // Worker Start Travel
    const travelBtn = this.container.querySelector('#btn-worker-start-travel');
    if (travelBtn && activeBooking) {
      travelBtn.addEventListener('click', () => {
        appState.updateBookingStatus(activeBooking.id, 'en_route');
      });
    }

    // Worker Mark Arrived
    const arrivedBtn = this.container.querySelector('#btn-worker-mark-arrived');
    if (arrivedBtn && activeBooking) {
      arrivedBtn.addEventListener('click', () => {
        appState.updateBookingStatus(activeBooking.id, 'arrived');
      });
    }

    // Worker OTP Verify
    const verifyOtpBtn = this.container.querySelector('#btn-worker-verify-otp');
    if (verifyOtpBtn && activeBooking) {
      verifyOtpBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#worker-otp-input');
        const code = input ? input.value.trim() : '';
        if (code === activeBooking.otp) {
          appState.updateBookingStatus(activeBooking.id, 'in_progress');
        } else {
          soundFx.playTap();
          appState.addToast(`Incorrect OTP. Please enter "${activeBooking.otp}".`, "warning");
        }
      });
    }

    // Worker Add Extra Charge
    const addChargeBtn = this.container.querySelector('#btn-add-extra-charge');
    if (addChargeBtn && activeBooking) {
      addChargeBtn.addEventListener('click', () => {
        const nameInput = this.container.querySelector('#extra-part-name');
        const costInput = this.container.querySelector('#extra-part-cost');
        const name = nameInput ? nameInput.value.trim() : '';
        const cost = costInput ? parseFloat(costInput.value) : 0;

        if (name && cost > 0) {
          appState.addExtraCharge(activeBooking.id, name, cost);
          if (nameInput) nameInput.value = '';
          if (costInput) costInput.value = '';
        } else {
          appState.addToast("Please enter part name and valid amount.", "warning");
        }
      });
    }

    // Worker Mark Job Complete
    const completeJobBtn = this.container.querySelector('#btn-worker-complete-job');
    if (completeJobBtn && activeBooking) {
      completeJobBtn.addEventListener('click', () => {
        appState.updateBookingStatus(activeBooking.id, 'completed');
      });
    }
  }
}
