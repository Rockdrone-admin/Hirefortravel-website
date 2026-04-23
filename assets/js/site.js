(function () {
  const config = window.HFT_CONFIG || {};
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const nav = document.querySelector("[data-mobile-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const yearNode = document.querySelector("[data-current-year]");
  const activeLinks = document.querySelectorAll("[data-nav-link]");
  const contactForms = document.querySelectorAll("[data-inline-lead-form]");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

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
      whatsappText: config.companyWhatsAppText || "Hi HireForTravel, I want to hire.",
      meta: [],
      fields: [
        { name: "contactPersonName", label: "Your Name", type: "text", required: true },
        { name: "companyName", label: "Company Name", type: "text", required: true },
        { name: "designation", label: "Designation", type: "text", required: true },
        { name: "hiringForRole", label: "Roles You're Hiring For", type: "text", required: true, placeholder: "e.g., Sales, Operations, Marketing" },
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
      whatsappText: config.candidateWhatsAppText || "Hi HireForTravel, I want to apply for travel jobs.",
      meta: ["Travel-only opportunities", "Short forms", "WhatsApp updates available"],
      fields: [
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "phoneNumber", label: "Phone Number", type: "tel", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "currentRole", label: "Current Role", type: "text", required: true },
        {
          name: "experience",
          label: "Experience",
          type: "select",
          required: true,
          options: ["0-1 years", "1-3 years", "3-5 years", "5-8 years", "8+ years"]
        },
        { name: "preferredRole", label: "Preferred Role", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: false, placeholder: "e.g., Delhi, Mumbai, Remote" },
        {
          name: "cvFile",
          label: "Upload CV (optional)",
          type: "file",
          required: false,
          accept: ".pdf,.doc,.docx"
        }
      ]
    }
  };

  let activeModal = null;
  let lastTriggerLabel = "";

  function buildField(field) {
    const fieldClass = "field";
    if (field.type === "select") {
      const options = ['<option value="">Select</option>']
        .concat(field.options.map((option) => `<option value="${option}">${option}</option>`))
        .join("");
      return `
        <div class="${fieldClass}">
          <label for="${field.name}">${field.label}</label>
          <select id="${field.name}" name="${field.name}" ${field.required ? "required" : ""}>
            ${options}
          </select>
        </div>`;
    }

    if (field.type === "file") {
      return `
        <div class="${fieldClass} field--full">
          <label for="${field.name}">${field.label}</label>
          <input id="${field.name}" name="${field.name}" type="file" ${field.accept ? `accept="${field.accept}"` : ""}>
          <span class="field__hint">If your webhook only accepts JSON, the selected file name is logged and the actual CV can be shared on WhatsApp.</span>
        </div>`;
    }

    return `
      <div class="${fieldClass}">
        <label for="${field.name}">${field.label}</label>
        <input id="${field.name}" name="${field.name}" type="${field.type}" ${field.required ? "required" : ""} ${field.placeholder ? `placeholder="${field.placeholder}"` : ""} autocomplete="on">
      </div>`;
  }

  function setStatus(target, message, state) {
    if (!target) return;
    target.className = `form-status is-visible ${state === "error" ? "form-status--error" : "form-status--success"}`;
    target.innerHTML = message;
  }

  function clearStatus(target) {
    if (!target) return;
    target.className = "form-status";
    target.textContent = "";
  }

  function getWhatsAppUrl(intentText) {
    const encoded = encodeURIComponent(intentText || config.generalWhatsAppText || "Hi HireForTravel, I would like to connect.");
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

  document.querySelectorAll("[data-open-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      const modalType = trigger.getAttribute("data-open-modal");
      if (!modalType) return;
      event.preventDefault();
      openModal(modalType, trigger.textContent.trim());
    });
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

    if (!response.ok) {
      console.error("Webhook request failed:", response.status, response.statusText);
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
          // File size limit: 1.9 MB (converts to ~2.5 MB when base64 encoded)
          const maxSizeMB = 1.9;
          if (value.size > maxSizeMB * 1024 * 1024) {
            throw new Error(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`);
          }
          // Read file as base64 for upload
          const filePromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              values[`${key}Data`] = e.target.result; // base64 encoded file
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

  async function handleLeadSubmit(form, statusNode, submitButton, whatsappIntent) {
    clearStatus(statusNode);
    const payload = await formDataToObject(form);
    payload.timestamp = new Date().toISOString();
    payload.pageUrl = window.location.href;
    payload.cta = form.dataset.triggerLabel || "";
    payload.source = form.dataset.source || payload.source || "Lead";

    if (!payload.source) {
      payload.source = "Lead";
    }

    // Debug logging
    console.log("Submitting payload:", payload);

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await submitPayload(payload);
      setStatus(statusNode, "<strong>Thanks! We’ll reach out in 24-48 hrs.</strong>", "success");
      form.reset();
    } catch (error) {
      setStatus(statusNode, "<strong>Something went wrong</strong><br>Please connect with us directly on WhatsApp", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = form === modalForm ? forms[activeModal || "company"].submit : `Send Inquiry ${iconArrow}`;
    }
  }

  if (modalForm) {
    modalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formType = modalForm.dataset.intent || "company";
      const whatsappIntent = forms[formType]?.whatsappText || config.generalWhatsAppText;
      await handleLeadSubmit(modalForm, modalStatus, modalSubmitLabel, whatsappIntent);
    });
  }

  contactForms.forEach((form) => {
    const statusNode = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector("[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      form.dataset.triggerLabel = "Contact Page Form";
      form.dataset.source = form.querySelector("[name='inquiryType']")?.value || "Contact";
      const selectedIntent = form.dataset.source === "Candidate" ? config.candidateWhatsAppText : config.companyWhatsAppText;
      await handleLeadSubmit(form, statusNode, submitButton, selectedIntent);
    });
  });
})();
