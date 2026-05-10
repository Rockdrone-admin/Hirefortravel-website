(function () {
  const config = window.HFT_CONFIG || {};
  const GENERIC_FORM_ERROR = "Something went wrong! Please connect with us directly over Whatsapp.";
  const MIN_SUCCESS_DELAY_MS = 400;
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const nav = document.querySelector("[data-mobile-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const yearNode = document.querySelector("[data-current-year]");
  const activeLinks = document.querySelectorAll("[data-nav-link]");
  const contactForms = document.querySelectorAll("[data-inline-lead-form]");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  // Analytics helper
  async function dispatchAnalyticsEvent(eventType, source, metadata = {}) {
    try {
      const sessionId = sessionStorage.getItem('hft_session_id') || 'unknown';
      const apiUrl = window.HFT_API_URL || 'http://localhost:3002';
      await fetch(`${apiUrl}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          source: source,
          page: window.location.pathname,
          metadata: { ...metadata, session_id: sessionId }
        })
      });
    } catch (err) {
      console.warn('Analytics dispatch failed:', err);
    }
  }

  // Session Tracking
  if (!sessionStorage.getItem('hft_session_id')) {
    const newSessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('hft_session_id', newSessionId);
    dispatchAnalyticsEvent('session_start', 'Website', { is_new_session: true });
  }

  // Track WhatsApp Clicks globally
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && (link.href.includes('wa.me') || link.href.includes('api.whatsapp.com'))) {
      const urlText = link.href.toLowerCase();
      let source = 'Contact';
      
      // Classify source based on URL pre-filled text or current page
      const decodedUrl = decodeURIComponent(urlText);
      if (decodedUrl.includes('apply') || decodedUrl.includes('jobs') || window.location.pathname.includes('/candidates')) {
        source = 'Candidate';
      } else if (decodedUrl.includes('hire candidates') || decodedUrl.includes('hiring') || window.location.pathname.includes('/companies')) {
        source = 'Company';
      }
      
      dispatchAnalyticsEvent('whatsapp_click', source, { url: link.href });
    }
  });

  activeLinks.forEach((link) => {
    const linkPath = link.getAttribute("href")?.replace(/\/+$/, "") || "/";
    if (linkPath === currentPath || (linkPath !== "/" && currentPath.startsWith(linkPath))) {
      link.classList.add("is-active");
    }
  });

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => nav.classList.remove("is-open"));
    });
  }

  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-scroll-to]");
    if (!trigger) return;
    event.preventDefault();
    const selector = trigger.getAttribute("data-scroll-to");
    if (!selector) return;
    const target = document.querySelector(selector);
    if (!target) return;

    const headerOffsetRaw = getComputedStyle(document.documentElement).getPropertyValue("--header-height");
    const headerOffset = Number.parseFloat(headerOffsetRaw) || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });

  document.body.addEventListener("toggle", (event) => {
    const panel = event.target;
    if (!panel.matches("details.role-panel") || !panel.open) return;
    
    // Close others
    const accordion = panel.closest(".roles-accordion");
    if (accordion) {
      const panels = Array.from(accordion.querySelectorAll("details.role-panel"));
      panels.forEach((other) => {
        if (other !== panel) other.open = false;
      });
    }

    const headerOffsetRaw = getComputedStyle(document.documentElement).getPropertyValue("--header-height");
    const headerOffset = Number.parseFloat(headerOffsetRaw) || 0;
    const top = panel.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, true);

  const iconArrow = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"></path>
      <path d="m13 5 7 7-7 7"></path>
    </svg>`;

  const modalMarkup = `
    <div class="modal-root" data-modal-root aria-hidden="true">
      <div class="modal-backdrop" data-close-modal></div>
      <section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        <div class="modal__header">
          <div>
            <span class="eyebrow" data-modal-eyebrow>Quick Connect</span>
            <h2 id="lead-modal-title" data-modal-title>Let's talk</h2>
            <p data-modal-copy>Share a few details and we'll get back shortly.</p>
          </div>
          <button class="modal__close" type="button" data-close-modal aria-label="Close dialog">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="modal__body">
          <div class="modal__meta" data-modal-meta></div>
          <form data-lead-form novalidate>
            <input type="hidden" name="source" data-hidden-source>
            <input type="hidden" name="originPage" value="${window.location.pathname}">
            <div class="form-grid" data-modal-fields></div>
            <div class="form-status" data-form-status role="status" aria-live="polite"></div>
            <div class="modal__footer">
              <button class="button button--primary" type="submit" data-submit-label>Submit ${iconArrow}</button>
              <a class="button button--secondary" data-modal-whatsapp href="#" target="_blank" rel="noopener">Continue on WhatsApp</a>
            </div>
          </form>
        </div>
      </section>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalMarkup);

  const modalRoot = document.querySelector("[data-modal-root]");
  const modalTitle = document.querySelector("[data-modal-title]");
  const modalCopy = document.querySelector("[data-modal-copy]");
  const modalEyebrow = document.querySelector("[data-modal-eyebrow]");
  const modalMeta = document.querySelector("[data-modal-meta]");
  const modalFields = document.querySelector("[data-modal-fields]");
  const modalForm = document.querySelector("[data-lead-form]");
  const modalSource = document.querySelector("[data-hidden-source]");
  const modalStatus = document.querySelector("[data-form-status]");
  const modalSubmitLabel = document.querySelector("[data-submit-label]");
  const modalWhatsApp = document.querySelector("[data-modal-whatsapp]");

  const forms = {
    company: {
      eyebrow: "For Companies",
      title: "Need travel industry talent?",
      copy: "Tell us what you are hiring for and we'll shortlist relevant, pre-screened profiles.",
      submit: `Get Candidates ${iconArrow}`,
      source: "Company",
      whatsappText: config.companyWhatsAppText || "Hi Team HireForTravel, \nI’m looking to hire candidates for our travel brand. Can you help?",
      meta: [],
      fields: [
        { name: "contactPersonName", label: "Your Name", type: "text", required: true },
        { name: "companyName", label: "Company Name", type: "text", required: true },
        { name: "designation", label: "Your Designation", type: "text", required: true },
        { name: "hiringForRole", label: "Roles You're Hiring For *", type: "text", required: true, placeholder: "e.g., Sales, Operations, Marketing" },
        {
          name: "numberOfOpenings",
          label: "Number of openings",
          type: "select",
          required: true,
          options: ["1–2", "3–5", "6–10", "10+"]
        },
        { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g., Delhi, Mumbai, Bangalore or Remote" },
        { name: "phoneNumber", label: "Contact Number", type: "tel", required: true },
        { name: "email", label: "Work Email", type: "email", required: true }
      ]
    
    },
    candidate: {
      eyebrow: "For Candidates",
      title: "Apply for travel roles",
      copy: "Share your profile and preferred role. We'll match you with relevant openings across the travel ecosystem.",
      submit: `Apply Now ${iconArrow}`,
      source: "Candidate",
      whatsappText: config.candidateWhatsAppText || "Hi Team HireForTravel, \nI'm looking to apply for travel jobs. Are there any open positions?",
      meta: [],
      fields: [
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "phoneNumber", label: "Contact Number", type: "tel", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g., Delhi, Mumbai, Bangalore or Remote" },
        { name: "applyingFor", label: "Applying for", type: "text", required: true, placeholder: "e.g., Sales, Operations, Marketing" },
        {
          name: "cvFile",
          label: "Upload CV",
          type: "file",
          required: true,
          accept: ".pdf,.doc,.docx"
        },
        {
          name: "referredByCheckbox",
          label: "Referred By (Optional)",
          type: "checkbox",
          required: false,
          conditional: true
        },
        { name: "referrerName", label: "Referrer's Name", type: "text", required: false, conditional: "referredByCheckbox" },
        { name: "referrerContact", label: "Referrer's Contact Number", type: "tel", required: false, conditional: "referredByCheckbox" }
      ]
    }
  };

  let activeModal = null;
  let lastTriggerLabel = "";

  function buildField(field) {
    const fieldClass = "field";
    
    if (field.type === "checkbox") {
      return `
        <div class="${fieldClass}">
          <label for="${field.name}" style="display: flex; align-items: center; gap: 0.5rem;">
            <input id="${field.name}" name="${field.name}" type="checkbox" style="width: auto; margin: 0;">
            <span>${field.label}</span>
          </label>
        </div>`;
    }
    
    if (field.type === "select") {
      const options = ['<option value="">Select</option>']
        .concat(field.options.map((option) => `<option value="${option}">${option}</option>`))
        .join("");
      return `
        <div class="${fieldClass}" ${field.conditional ? `data-conditional="${field.conditional}"` : ""} style="${field.conditional ? 'display: none;' : ''}" data-field-name="${field.name}">
          <label for="${field.name}">${field.label}</label>
          <select id="${field.name}" name="${field.name}" ${field.required ? "required" : ""} style="border-color: inherit;">
            ${options}
          </select>
        </div>`;
    }

    if (field.type === "file") {
      return `
        <div class="${fieldClass} field--full" ${field.conditional ? `data-conditional="${field.conditional}"` : ""} style="${field.conditional ? 'display: none;' : ''}" data-field-name="${field.name}">
          <label for="${field.name}">${field.label}</label>
          <input id="${field.name}" name="${field.name}" type="file" ${field.required ? "required" : ""} ${field.accept ? `accept="${field.accept}"` : ""} style="border-color: inherit;">
          <span class="field__hint">${field.required ? "PDF and Word formats only" : "If your webhook only accepts JSON, the selected file name is logged and the actual CV can be shared on WhatsApp."}</span>
        </div>`;
    }

    return `
      <div class="${fieldClass}" ${field.conditional ? `data-conditional="${field.conditional}"` : ""} style="${field.conditional ? 'display: none;' : ''}" data-field-name="${field.name}">
        <label for="${field.name}">${field.label}</label>
        <input id="${field.name}" name="${field.name}" type="${field.type}" ${field.required ? "required" : ""} ${field.placeholder ? `placeholder="${field.placeholder}"` : ""} autocomplete="on" style="border-color: inherit;">
      </div>`;
  }

  function setStatus(target, message, state) {
    if (!target) return;
    const stateClass = state === "error" ? "form-status--error" : `form-status--${state || "success"}`;
    target.className = `form-status is-visible ${stateClass}`;
    target.innerHTML = message;
  }

  function clearStatus(target) {
    if (!target) return;
    target.className = "form-status";
    target.textContent = "";
  }

  function validateForm(form) {
    let isValid = true;
    
    // Clear previous error states
    form.querySelectorAll('.field--error').forEach(field => {
      field.classList.remove('field--error');
      const errorMsg = field.querySelector('.field__error');
      if (errorMsg) {
        errorMsg.remove();
      }
    });

    // Validate each field
    form.querySelectorAll('input, select, textarea').forEach(field => {
      // Skip checkboxes from validation
      if (field.type === 'checkbox') return;
      
      const container = field.closest('.field, [class*="field"]') || field.parentElement;
      const isRequired = field.hasAttribute('required');
      const isEmpty = !field.value || field.value.trim() === '';
      
      // Check if field container is visible
      let isVisible = true;
      if (container) {
        const computedStyle = window.getComputedStyle(container);
        isVisible = computedStyle.display !== 'none';
      }

      // Only validate if field is visible and required
      if (isVisible && isRequired && isEmpty) {
        isValid = false;
        
        // Add error styling
        if (container) {
          container.classList.add('field--error');
          
          // Add error message if it doesn't exist
          if (!container.querySelector('.field__error')) {
            const errorMsg = document.createElement('span');
            errorMsg.className = 'field__error';
            errorMsg.textContent = '* is required';
            
            const hint = container.querySelector('.field__hint');
            if (hint) {
              hint.parentNode.insertBefore(errorMsg, hint);
            } else {
              container.appendChild(errorMsg);
            }
          }
        }
      }
    });

    return isValid;
  }

  function getWhatsAppUrl(intentText) {
    const encoded = encodeURIComponent(intentText || config.generalWhatsAppText || "Hi Team HireForTravel,\nI came across your platform and wanted to connect.");
    return `https://wa.me/919266788980?text=${encoded}`;
  }

  function openModal(type, triggerLabel) {
    const selected = forms[type];
    if (!selected) return;

    activeModal = type;
    lastTriggerLabel = triggerLabel || "";
    modalEyebrow.textContent = selected.eyebrow;
    modalTitle.textContent = selected.title;
    modalCopy.textContent = selected.copy;
    modalMeta.innerHTML = selected.meta.map((item) => `<span>${item}</span>`).join("");
    modalFields.innerHTML = selected.fields.map(buildField).join("");
    modalSource.value = selected.source;
    modalForm.dataset.source = selected.source;
    modalForm.dataset.intent = type;
    modalForm.dataset.triggerLabel = lastTriggerLabel;
    modalSubmitLabel.innerHTML = selected.submit;
    modalWhatsApp.href = getWhatsAppUrl(selected.whatsappText);
    modalWhatsApp.textContent = type === "company" ? "Discuss on WhatsApp" : "Send profile on WhatsApp";
    clearStatus(modalStatus);
    modalForm.reset();
    
    // Handle conditional fields for checkbox
    const checkboxes = modalFields.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const checkboxName = checkbox.name;
      const conditionalFields = modalFields.querySelectorAll(`[data-conditional="${checkboxName}"]`);
      
      // Set initial state
      conditionalFields.forEach(field => {
        field.style.display = checkbox.checked ? '' : 'none';
      });
      
      // Add change listener
      checkbox.addEventListener('change', () => {
        conditionalFields.forEach(field => {
          field.style.display = checkbox.checked ? '' : 'none';
          // Update required attribute based on checkbox state
          const inputs = field.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            if (checkbox.checked && field.dataset.conditional === checkboxName) {
              input.removeAttribute('required');
            }
          });
        });
      });
    });
    
    modalRoot.classList.add("is-open");
    modalRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    const firstInput = modalForm.querySelector("input, select");
    if (firstInput) {
      window.setTimeout(() => firstInput.focus(), 40);
    }
  }

  function closeModal() {
    activeModal = null;
    modalRoot.classList.remove("is-open");
    modalRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
  }

  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-modal]");
    if (!trigger) return;
    const modalType = trigger.getAttribute("data-open-modal");
    if (!modalType) return;
    event.preventDefault();
    openModal(modalType, trigger.textContent.trim());
  });

  modalRoot.querySelectorAll("[data-close-modal]").forEach((trigger) => {
    trigger.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.classList.contains("is-open")) {
      closeModal();
    }
  });

  async function submitPayload(payload) {
    const webhookUrl = config.webhookUrl || "";
    const webhookConfigured = webhookUrl && !/REPLACE_WITH_YOUR_WEBHOOK_ID/i.test(webhookUrl);

    if (!webhookConfigured) {
      console.log("Demo mode: webhook not configured");
      return { ok: true, demoMode: true };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let responseData = {};
    try {
      responseData = await response.json();
    } catch (error) {
      console.error("Unable to parse webhook response:", error);
    }

    if (!response.ok) {
      console.error("Webhook request failed:", response.status, responseData);
      throw new Error("Webhook request failed");
    }

    console.log("Payload submitted successfully");
    return { ok: true, demoMode: false };
  }

  async function formDataToObject(form) {
    const formData = new FormData(form);
    const values = {};
    let filePromises = [];

    formData.forEach((value, key) => {
      if (value instanceof File) {
        if (value.name && value.size > 0) {
          // File size limit: 3 MB (converts to ~4 MB when base64 encoded)
          const maxSizeMB = 3;
          if (value.size > maxSizeMB * 1024 * 1024) {
            const error = new Error(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`);
            error.isUserInputError = true;
            throw error;
          }
          // Read file as base64 for upload
          const filePromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              values[`${key}Data`] = e.target.result; // base64 encoded file
              values[`${key}Name`] = value.name; // preserve original file name and extension
              resolve();
            };
            reader.readAsDataURL(value);
          });
          filePromises.push(filePromise);
        }
        return;
      }
      values[key] = typeof value === "string" ? value.trim() : value;
    });

    // Return a promise that resolves when all files are processed
    await Promise.all(filePromises);
    return values;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function handleLeadSubmit(form, statusNode, submitButton, whatsappIntent) {
    clearStatus(statusNode);
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    setStatus(statusNode, "<strong>Submitting...</strong>", "pending");

    try {
      const payloadPromise = Promise.all([
        formDataToObject(form),
        wait(MIN_SUCCESS_DELAY_MS)
      ]).then(([payload]) => payload);

      await payloadPromise;
      setStatus(statusNode, "<strong>Thanks! We’ll reach out in 24-48 hrs.</strong>", "success");
      form.reset();

      payloadPromise
        .then((payload) => {
          payload.timestamp = new Date().toISOString();
          payload.pageUrl = window.location.href;
          payload.cta = form.dataset.triggerLabel || "";

          // Determine source - prefer form.dataset.source, then activeModal for modal forms
          let source = form.dataset.source;
          if (!source && form === modalForm && activeModal) {
            source = forms[activeModal]?.source;
          }

          payload.source = source || "Contact";

          // Debug logging
          console.log("Form source:", source);
          console.log("Submitting payload:", payload);
          
          dispatchAnalyticsEvent('lead_submitted', source, {
            cta: payload.cta,
            pageUrl: payload.pageUrl
          });

          return submitPayload(payload).catch((error) => {
            console.error("Background form submission failed after optimistic success:", {
              error,
              source: payload.source,
              pageUrl: payload.pageUrl,
              submittedAt: payload.timestamp
            });
          });
        })
        .catch((error) => {
          console.error("Form payload preparation failed after optimistic success:", error);

          if (error.isUserInputError) {
            setStatus(statusNode, `<strong>Error:</strong> ${error.message}`, "error");
          }
        });
    } catch (error) {
      console.error("Form submission error:", error);

      const errorMessage = error.isUserInputError ? error.message : GENERIC_FORM_ERROR;
      setStatus(statusNode, `<strong>Error:</strong> ${errorMessage}`, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = form === modalForm ? forms[activeModal || "company"].submit : `Send Inquiry ${iconArrow}`;
    }
  }

  if (modalForm) {
    modalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      // Update required attributes for conditional fields before validation
      const fields = modalForm.querySelectorAll('[data-conditional]');
      fields.forEach(field => {
        const inputs = field.querySelectorAll('input, select, textarea');
        const isVisible = field.style.display !== 'none';
        inputs.forEach(input => {
          if (isVisible) {
            input.setAttribute('required', 'required');
          } else {
            input.removeAttribute('required');
            input.value = ''; // Clear value if hidden
          }
        });
      });
      
      // Validate form before submission
      if (!validateForm(modalForm)) {
        setStatus(modalStatus, "<strong>Error:</strong> Please fill in all required fields.", "error");
        return;
      }
      
      clearStatus(modalStatus);
      const formType = modalForm.dataset.intent || "company";
      const whatsappIntent = forms[formType]?.whatsappText || config.generalWhatsAppText;
      await handleLeadSubmit(modalForm, modalStatus, modalSubmitLabel, whatsappIntent);
    });
  }

  // Share Job Functionality
  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-share-job]");
    if (!trigger) return;
    
    event.preventDefault();
    event.stopPropagation(); // Prevent accordion from toggling
    const jobData = JSON.parse(trigger.getAttribute("data-share-job"));
    const shareUrl = `${window.location.origin}/candidates?job=${jobData.id}#job-${jobData.id}`;
    const shareTitle = `${jobData.title} at ${jobData.company} | HireForTravel`;
    const shareText = `Check out this job opening: ${jobData.title} at ${jobData.company}.`;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      }).catch(err => console.warn("Share failed", err));
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = trigger.innerHTML;
        trigger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          trigger.innerHTML = originalText;
        }, 2000);
      });
    }
  });

  // Handle auto-scroll to job from URL
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('job');
  if (jobId) {
    const targetJob = document.getElementById(`job-${jobId}`);
    if (targetJob) {
      setTimeout(() => {
        const headerOffsetRaw = getComputedStyle(document.documentElement).getPropertyValue("--header-height");
        const headerOffset = Number.parseFloat(headerOffsetRaw) || 0;
        const top = targetJob.getBoundingClientRect().top + window.scrollY - headerOffset - 24;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }, 300); // Small delay to ensure rendering and other scrolls are done
    }
  }


  contactForms.forEach((form) => {
    const statusNode = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector("[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      // Validate form before submission
      if (!validateForm(form)) {
        setStatus(statusNode, "<strong>Error:</strong> Please fill in all required fields.", "error");
        return;
      }
      
      clearStatus(statusNode);
      form.dataset.triggerLabel = "Contact Page Form";
      form.dataset.source = form.querySelector("[name='inquiryType']")?.value || "Contact";
      const selectedIntent = form.dataset.source === "Candidate" ? config.candidateWhatsAppText : config.companyWhatsAppText;
      await handleLeadSubmit(form, statusNode, submitButton, selectedIntent);
    });
  });
})();
