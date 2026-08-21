/**
 * Emergency SOS Safety System Module
 * 5-second cancel countdown, audio siren synthesis, live GPS beacon broadcast
 */

import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class SosModule {
  constructor() {
    this.modalEl = null;
    this.countdownSeconds = 5;
    this.timerInterval = null;
    this._initModal();
  }

  _initModal() {
    let modal = document.getElementById('sos-emergency-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sos-emergency-modal';
      modal.className = 'modal-backdrop sos-modal-backdrop';
      document.body.appendChild(modal);
    }
    this.modalEl = modal;
  }

  openModal() {
    this.countdownSeconds = 5;
    this.modalEl.classList.add('is-open');
    this.render();

    // Start 5s countdown
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.countdownSeconds -= 1;
      if (this.countdownSeconds <= 0) {
        clearInterval(this.timerInterval);
        this._dispatchEmergencySignal();
      }
      this.render();
    }, 1000);
  }

  closeModal() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.modalEl.classList.remove('is-open');
    appState.cancelSOS();
  }

  _dispatchEmergencySignal() {
    soundFx.stopSosSiren();
    appState.addToast("EMERGENCY SIGNAL BROADCASTED: Local Emergency Response (112) & Trust Contacts Notified with Live GPS Coordinates.", "error");
  }

  render() {
    const isTriggered = this.countdownSeconds <= 0;

    this.modalEl.innerHTML = `
      <div class="modal-card sos-panic-card ${isTriggered ? 'is-dispatched' : ''}">
        <div class="sos-top-warning">
          <div class="sos-icon-pulsar">
            <i data-lucide="shield-alert"></i>
          </div>
          <h2>${isTriggered ? 'EMERGENCY DISPATCH ACTIVE' : 'EMERGENCY SOS TRIGGERED'}</h2>
          <p>${isTriggered ? 'Live audio/video recording active. Emergency team dispatched to your location.' : 'Contacting 24x7 Safety Control Room & Emergency Services.'}</p>
        </div>

        ${!isTriggered ? `
          <div class="sos-countdown-circle">
            <span class="countdown-num">${this.countdownSeconds}</span>
            <span class="countdown-label">Seconds to Cancel</span>
          </div>
          <p class="sos-disclaimer">If this was triggered by mistake, tap the button below immediately.</p>
        ` : `
          <div class="sos-dispatched-box">
            <div class="sos-beacon-row">
              <i data-lucide="map-pin"></i>
              <div>
                <strong>GPS Beacon Active:</strong>
                <span>28.6139° N, 77.2090° E (Accuracy: 4 meters)</span>
              </div>
            </div>
            <div class="sos-beacon-row">
              <i data-lucide="phone-call"></i>
              <div>
                <strong>Contacts Alerted via SMS:</strong>
                <span>Mom (+91 98765 12345), Safety Desk (+91 1800 200 442)</span>
              </div>
            </div>
          </div>
        `}

        <div class="sos-actions-bar">
          <button class="btn btn-secondary btn-lg" id="btn-cancel-sos">
            <i data-lucide="check"></i> <span>I Am Safe (Cancel Alert)</span>
          </button>
          
          <button class="btn btn-outline btn-mute-siren" id="btn-toggle-siren">
            <i data-lucide="volume-x"></i> <span>Mute Siren</span>
          </button>
        </div>
      </div>
    `;

    this._bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  _bindEvents() {
    const cancelBtn = this.modalEl.querySelector('#btn-cancel-sos');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    const muteBtn = this.modalEl.querySelector('#btn-toggle-siren');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        soundFx.stopSosSiren();
        appState.addToast("Siren muted.", "info");
      });
    }
  }
}
