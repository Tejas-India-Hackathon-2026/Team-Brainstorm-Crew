/**
 * SkillSync Pro - Central Reactive State Store with LocalStorage Persistence
 */

import { TECHNICIANS } from './data/technicians.js';
import { soundFx } from './audio-fx.js';

const STORAGE_KEY = 'skillsync_pro_app_state_v1';

class AppStateStore {
  constructor() {
    this.listeners = new Set();
    this.state = this._loadInitialState();
    this._startTechnicianMovementSimulation();
  }

  _loadInitialState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          activeIncomingRequest: null // Clear stale transient request modal on load
        };
      } catch (e) {
        console.error("Failed to parse state, falling back to default", e);
      }
    }

    return {
      currentRole: 'customer', // 'customer' | 'technician'
      currentTab: 'home',       // 'home' | 'ai-diagnostics' | 'live-tracking' | 'my-bookings' | 'worker-portal' | 'earnings'
      theme: 'light',           // 'light' | 'dark'
      
      // Customer profile
      customer: {
        id: "cust-101",
        name: "Abhishek Sharma",
        phone: "+91 98765 00112",
        email: "abhishek@example.com",
        savedAddresses: [
          { id: "addr-1", label: "Home (Sector 62, Noida)", fullAddress: "Flat 402, Block B, Silver Oak Towers, Sector 62, Noida, UP", isDefault: true },
          { id: "addr-2", label: "Office (Cyber City)", fullAddress: "Tower B, 7th Floor, DLF Cyber Hub, Gurugram, HR", isDefault: false }
        ],
        selectedAddressId: "addr-1"
      },

      // Active Technician (for Worker Role view)
      worker: {
        ...TECHNICIANS[0],
        isOnline: true,
        todayEarnings: 2450,
        weeklyEarnings: 16800,
        completedJobsToday: 4,
        totalCompletedJobs: 1484,
        acceptanceRate: 98,
        rating: 4.96
      },

      // Current active booking being tracked (or null)
      activeBooking: null,

      // Bookings history
      bookingsHistory: [
        {
          id: "SS-8491",
          serviceTitle: "Power Jet Deep Foam AC Service",
          category: "ac-repair",
          status: "completed",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          technician: TECHNICIANS[2],
          totalAmount: 599,
          paymentMethod: "UPI (Google Pay)",
          rating: 5,
          userReview: "Super clean service, cooling is 100% restored!"
        }
      ],

      // Active AI Diagnostic report (ready to attach to booking)
      activeDiagnosticReport: null,
      diagnosticsHistory: [],

      // Incoming request radar for technician
      activeIncomingRequest: null,

      // Emergency SOS active state
      sosActive: false,
      sosTimestamp: null,

      // App notification toasts
      notifications: []
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Storage save failed:", e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(eventKey = 'state_change') {
    this.save();
    this.listeners.forEach(fn => {
      try {
        fn(this.state, eventKey);
      } catch (err) {
        console.error("State listener error:", err);
      }
    });
  }

  // --- ACTIONS ---

  setRole(role) {
    if (this.state.currentRole === role) return;
    this.state.currentRole = role;
    if (role === 'technician') {
      this.state.currentTab = 'worker-portal';
    } else {
      this.state.currentTab = 'home';
    }
    soundFx.playTap();
    this.notify('role_changed');
  }

  setTab(tab) {
    this.state.currentTab = tab;
    soundFx.playTap();
    this.notify('tab_changed');
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    soundFx.playTap();
    this.notify('theme_changed');
  }

  setWorkerOnline(isOnline) {
    this.state.worker.isOnline = isOnline;
    soundFx.playTap();
    if (isOnline) {
      this.addToast("You are now ONLINE. Searching for nearby service requests...", "info");
    } else {
      this.addToast("You are now OFFLINE. No dispatch requests will be received.", "warning");
    }
    this.notify('worker_status_changed');
  }

  // Save an AI Diagnostic result
  setActiveDiagnostic(report) {
    this.state.activeDiagnosticReport = report;
    this.state.diagnosticsHistory.unshift({
      ...report,
      savedAt: new Date().toISOString()
    });
    this.notify('diagnostic_ready');
  }

  clearActiveDiagnostic() {
    this.state.activeDiagnosticReport = null;
    this.notify('diagnostic_cleared');
  }

  // Create a new booking from customer
  createBooking({ service, slotType, scheduledDate, scheduledTime, address, aiReport = null, notes = "" }) {
    const bookingId = `SS-${Math.floor(1000 + Math.random() * 9000)}`;
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Choose most relevant technician or first available
    const assignedTech = TECHNICIANS.find(t => t.skills.some(s => s.toLowerCase().includes(service.category || ''))) || TECHNICIANS[0];

    const newBooking = {
      id: bookingId,
      serviceTitle: service.title,
      category: service.category || 'home-service',
      serviceDetails: service,
      basePrice: service.basePrice,
      partsTotal: aiReport ? aiReport.requiredParts.reduce((acc, p) => acc + p.cost, 0) : 0,
      totalAmount: (service.basePrice + (aiReport ? aiReport.requiredParts.reduce((acc, p) => acc + p.cost, 0) : 0)),
      extraCharges: [],
      slotType, // 'emergency' | 'scheduled'
      scheduledDate: scheduledDate || 'Today',
      scheduledTime: scheduledTime || 'Instant 30-min',
      address,
      notes,
      aiReport,
      otp,
      status: 'assigned', // 'assigned' -> 'en_route' -> 'arrived' -> 'in_progress' -> 'completed'
      createdAt: new Date().toISOString(),
      technician: assignedTech,
      etaMinutes: slotType === 'emergency' ? 18 : 35,
      timeline: [
        { status: 'assigned', label: 'Technician Assigned', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), done: true },
        { status: 'en_route', label: 'On The Way', time: 'In 5 mins', done: false },
        { status: 'arrived', label: 'Arrived at Doorstep', time: 'Pending', done: false },
        { status: 'in_progress', label: 'Work In Progress', time: 'Pending', done: false },
        { status: 'completed', label: 'Service Completed', time: 'Pending', done: false }
      ],
      currentDistanceKm: 2.4,
      techCoord: { x: 25, y: 75 }, // percentage on SVG map
      destCoord: { x: 80, y: 30 }
    };

    this.state.activeBooking = newBooking;
    this.state.currentTab = 'live-tracking';
    soundFx.playSuccess();
    this.addToast(`Booking ${bookingId} confirmed! ${assignedTech.name} is assigned.`, "success");

    // Also simulate incoming dispatch alert on the Technician portal side!
    this.state.activeIncomingRequest = {
      bookingId: newBooking.id,
      serviceTitle: newBooking.serviceTitle,
      customerName: this.state.customer.name,
      customerPhone: this.state.customer.phone,
      address: address.fullAddress,
      distanceKm: "2.4 km away",
      payoutAmount: Math.round(newBooking.totalAmount * 0.82), // 82% worker payout
      expiresInSeconds: 30,
      bookingRef: newBooking
    };

    this.notify('booking_created');
    this._startServiceLifecycleSimulation(newBooking.id);
    return newBooking;
  }

  // Update status of the active booking
  updateBookingStatus(bookingId, newStatus) {
    if (!this.state.activeBooking || this.state.activeBooking.id !== bookingId) return;

    this.state.activeBooking.status = newStatus;
    const nowTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    this.state.activeBooking.timeline.forEach(step => {
      if (step.status === newStatus) {
        step.done = true;
        step.time = nowTime;
      }
    });

    if (newStatus === 'en_route') {
      this.state.activeBooking.etaMinutes = 12;
      this.state.activeBooking.currentDistanceKm = 1.6;
      this.addToast("Technician is on the way to your address!", "info");
    } else if (newStatus === 'arrived') {
      this.state.activeBooking.etaMinutes = 0;
      this.state.activeBooking.currentDistanceKm = 0.05;
      soundFx.playIncomingJobAlert();
      this.addToast("Technician has arrived! Please share OTP " + this.state.activeBooking.otp + " to begin.", "warning");
    } else if (newStatus === 'in_progress') {
      soundFx.playSuccess();
      this.addToast("Service started: Technician is working on the repair.", "info");
    } else if (newStatus === 'completed') {
      soundFx.playSuccess();
      // Add to history
      this.state.bookingsHistory.unshift({ ...this.state.activeBooking });
      this.addToast("Service completed successfully! Please rate your experience.", "success");
      // Add worker payout
      this.state.worker.todayEarnings += Math.round(this.state.activeBooking.totalAmount * 0.82);
      this.state.worker.completedJobsToday += 1;
    }

    this.notify('booking_status_updated');
  }

  // Worker adds additional spare parts or extra charges during inspection
  addExtraCharge(bookingId, chargeName, amount) {
    if (!this.state.activeBooking || this.state.activeBooking.id !== bookingId) return;
    this.state.activeBooking.extraCharges.push({ name: chargeName, amount: Number(amount) });
    this.state.activeBooking.totalAmount += Number(amount);
    soundFx.playTap();
    this.addToast(`Added ₹${amount} for "${chargeName}" to job bill.`, "info");
    this.notify('booking_charge_added');
  }

  // Rate a completed booking
  submitRating(bookingId, rating, review = "") {
    const booking = this.state.bookingsHistory.find(b => b.id === bookingId) || this.state.activeBooking;
    if (booking) {
      booking.rating = rating;
      booking.userReview = review;
    }
    soundFx.playSuccess();
    this.addToast("Thank you for your rating & review!", "success");
    this.notify('rating_submitted');
  }

  // Trigger Emergency SOS
  triggerSOS() {
    this.state.sosActive = true;
    this.state.sosTimestamp = new Date().toISOString();
    soundFx.startSosSiren();
    this.notify('sos_triggered');
  }

  cancelSOS() {
    this.state.sosActive = false;
    soundFx.stopSosSiren();
    this.addToast("Emergency SOS Alert has been cancelled.", "info");
    this.notify('sos_cancelled');
  }

  // Add a toast notification
  addToast(message, type = "info") {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    const toast = { id, message, type, time: Date.now() };
    this.state.notifications.push(toast);
    this.notify('toast_added');

    setTimeout(() => {
      this.state.notifications = this.state.notifications.filter(t => t.id !== id);
      this.notify('toast_removed');
    }, 4500);
  }

  // Simulation timer for automated progress if user stays in customer view
  _startServiceLifecycleSimulation(bookingId) {
    setTimeout(() => {
      if (this.state.activeBooking && this.state.activeBooking.id === bookingId && this.state.activeBooking.status === 'assigned') {
        this.updateBookingStatus(bookingId, 'en_route');
      }
    }, 8000);

    setTimeout(() => {
      if (this.state.activeBooking && this.state.activeBooking.id === bookingId && this.state.activeBooking.status === 'en_route') {
        this.updateBookingStatus(bookingId, 'arrived');
      }
    }, 18000);
  }

  // Continuous subtle map movement for live technician GPS simulation
  _startTechnicianMovementSimulation() {
    setInterval(() => {
      if (this.state.activeBooking && (this.state.activeBooking.status === 'assigned' || this.state.activeBooking.status === 'en_route')) {
        const current = this.state.activeBooking.techCoord;
        const target = this.state.activeBooking.destCoord;
        
        // Step closer
        const dx = (target.x - current.x) * 0.08;
        const dy = (target.y - current.y) * 0.08;

        this.state.activeBooking.techCoord = {
          x: Math.min(Math.max(current.x + dx, 5), 95),
          y: Math.min(Math.max(current.y + dy, 5), 95)
        };

        if (this.state.activeBooking.etaMinutes > 1 && Math.random() > 0.6) {
          this.state.activeBooking.etaMinutes = Math.max(1, this.state.activeBooking.etaMinutes - 1);
        }

        this.notify('map_coord_tick');
      }
    }, 3000);
  }
}

export const appState = new AppStateStore();
