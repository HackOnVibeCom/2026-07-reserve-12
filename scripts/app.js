// Global state object
const state = {
  formData: null,
  positioningData: null,
  selectedOneliner: null,
  lockedPositioning: null,
  promoKitData: null,
  currentStep: 1
};

/**
 * Initializes the application on DOM Content Loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  // Bind CTA scroll buttons
  const heroCta = document.getElementById("hero-cta");
  if (heroCta) {
    heroCta.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("tool").scrollIntoView({ behavior: "smooth" });
    });
  }

  const startNowBtn = document.getElementById("btn-start-now");
  if (startNowBtn) {
    startNowBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("tool").scrollIntoView({ behavior: "smooth" });
    });
  }

  // Smooth scroll for nav links
  document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // Description character counter
  const descTextarea = document.getElementById("app-desc");
  const charCounter = document.getElementById("desc-char-count");
  if (descTextarea && charCounter) {
    descTextarea.addEventListener("input", () => {
      const len = descTextarea.value.length;
      charCounter.textContent = `${len} / 400`;
      
      // Remove previous color classes
      charCounter.classList.remove("count-warning", "count-critical");
      
      if (len >= 390) {
        charCounter.classList.add("count-critical");
      } else if (len >= 350) {
        charCounter.classList.add("count-warning");
      }

      checkFormCompleteness();
    });
  }

  // Add input listeners for all fields to handle real-time button status update
  const inputs = document.querySelectorAll(
    "#app-name, #app-category, #app-desc, #app-audience, #app-problem, #app-differentiator, input[name='platforms']"
  );
  inputs.forEach(input => {
    input.addEventListener("input", checkFormCompleteness);
    input.addEventListener("change", checkFormCompleteness);
  });

  // Form submit handler
  const form = document.getElementById("step-1-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleStep1Submit();
    });
  }

  // Initial check of form completeness
  checkFormCompleteness();
}

/**
 * Checks if all required fields are filled.
 * Adds/removes a class from the submit button to style it as visually disabled/enabled,
 * but leaves it technically clickable so validation shake animations can trigger.
 */
function checkFormCompleteness() {
  const submitBtn = document.getElementById("btn-find-positioning");
  if (!submitBtn) return;

  const appName = document.getElementById("app-name").value.trim();
  const category = document.getElementById("app-category").value;
  const desc = document.getElementById("app-desc").value.trim();
  const audience = document.getElementById("app-audience").value.trim();
  const problem = document.getElementById("app-problem").value.trim();
  const differentiator = document.getElementById("app-differentiator").value.trim();
  
  // Check if at least one checkbox is checked
  const platformsChecked = document.querySelectorAll("input[name='platforms']:checked").length > 0;

  const isComplete = appName && category && desc && audience && problem && differentiator && platformsChecked;

  if (isComplete) {
    submitBtn.classList.remove("btn-inactive");
  } else {
    submitBtn.classList.add("btn-inactive");
  }
}

/**
 * Collects form data from the UI.
 */
function collectFormData() {
  const appName = document.getElementById("app-name").value.trim();
  const category = document.getElementById("app-category").value;
  const description = document.getElementById("app-desc").value.trim();
  const audience = document.getElementById("app-audience").value.trim();
  const problem = document.getElementById("app-problem").value.trim();
  const differentiator = document.getElementById("app-differentiator").value.trim();
  
  const tone = document.querySelector("input[name='tone']:checked").value;
  const priceModel = document.querySelector("input[name='priceModel']:checked").value;
  const launchStage = document.querySelector("input[name='launchStage']:checked").value;
  
  const platforms = [];
  document.querySelectorAll("input[name='platforms']:checked").forEach(cb => {
    platforms.push(cb.value);
  });

  state.formData = {
    appName,
    category,
    description,
    audience,
    problem,
    differentiator,
    tone,
    platforms,
    priceModel,
    launchStage
  };
}

/**
 * Validates the form. Returns true if valid.
 * Shakes invalid fields and shows inline errors.
 */
function validateForm() {
  let isValid = true;
  
  // Clean past errors
  document.querySelectorAll(".form-group").forEach(group => {
    group.classList.remove("has-error");
    const errorEl = group.querySelector(".error-text");
    if (errorEl) errorEl.remove();
  });

  function setError(elementId, isGroup = false) {
    isValid = false;
    const inputEl = document.getElementById(elementId);
    if (!inputEl) return;

    // Find parent group
    const group = inputEl.closest(".form-group");
    if (group) {
      group.classList.add("has-error");
      
      // Inject error text if not present
      if (!group.querySelector(".error-text")) {
        const errorSpan = document.createElement("span");
        errorSpan.className = "error-text";
        errorSpan.textContent = "This field is required.";
        group.appendChild(errorSpan);
      }

      // Add shake class
      group.classList.remove("shake-anim");
      void group.offsetWidth; // Trigger reflow to restart animation
      group.classList.add("shake-anim");
    }
  }

  // Check texts
  const fields = ["app-name", "app-category", "app-desc", "app-audience", "app-problem", "app-differentiator"];
  fields.forEach(fieldId => {
    const val = document.getElementById(fieldId).value.trim();
    if (!val) {
      setError(fieldId);
    }
  });

  // Check platforms group
  const checkedPlatforms = document.querySelectorAll("input[name='platforms']:checked");
  if (checkedPlatforms.length === 0) {
    isValid = false;
    const group = document.querySelector(".platform-group").closest(".form-group");
    if (group) {
      group.classList.add("has-error");
      if (!group.querySelector(".error-text")) {
        const errorSpan = document.createElement("span");
        errorSpan.className = "error-text";
        errorSpan.textContent = "This field is required.";
        group.appendChild(errorSpan);
      }
      group.classList.remove("shake-anim");
      void group.offsetWidth;
      group.classList.add("shake-anim");
    }
  }

  return isValid;
}

/**
 * Handles Step 1 submit: validating, locking form, running Gemini call, showing skeletons.
 */
async function handleStep1Submit() {
  const isValid = validateForm();
  if (!isValid) return;

  // Collect form data
  collectFormData();

  // Lock inputs
  setFormInputsDisabled(true);

  // Clear older workspaces
  document.getElementById("positioning-workspace").innerHTML = "";
  document.getElementById("positioning-workspace").style.display = "none";
  document.getElementById("promo-kit-workspace").innerHTML = "";
  document.getElementById("promo-kit-workspace").style.display = "none";

  // Advance Stepper visually to Step 2 to show skeleton loads
  updateStepper(2);

  // Render Skeletons in positioning area
  renderSkeleton("positioning-workspace", 5);

  try {
    const data = await fetchPositioning(state.formData);
    state.positioningData = data;

    // Clear skeleton and render positioning results
    clearSkeleton("positioning-workspace");
    renderPositioning(data);
    showSuccess("Positioning options generated!");
  } catch (err) {
    console.error("Step 1 API Error: ", err);
    clearSkeleton("positioning-workspace");
    document.getElementById("positioning-workspace").style.display = "none";
    updateStepper(1);
    setFormInputsDisabled(false);
    showError(err.message || "An unexpected error occurred.", err.status);
  }
}

/**
 * Disables or enables all form inputs.
 * @param {boolean} disabled 
 */
function setFormInputsDisabled(disabled) {
  const inputs = document.querySelectorAll(
    "#step-1-form input, #step-1-form textarea, #step-1-form select, #btn-find-positioning"
  );
  inputs.forEach(el => {
    el.disabled = disabled;
  });

  const formCard = document.querySelector(".form-card");
  if (disabled) {
    formCard.classList.add("locked-form");
  } else {
    formCard.classList.remove("locked-form");
  }
}

/**
 * Handles selection of a positioning card.
 * @param {number} index 
 * @param {string} text 
 * @param {HTMLElement} cardEl 
 */
function handleCardSelect(index, text, cardEl) {
  state.selectedOneliner = index;
  
  // Highlight selection
  document.querySelectorAll(".one-liner-card").forEach(c => {
    c.classList.remove("selected");
  });
  cardEl.classList.add("selected");

  // Remove any existing inline edit field
  const oldEdit = document.querySelector(".inline-edit-container");
  if (oldEdit) oldEdit.remove();

  // Create editable input field container
  const editContainer = document.createElement("div");
  editContainer.className = "inline-edit-container fade-in";
  editContainer.innerHTML = `
    <label for="edit-oneliner-input" class="inline-edit-label">Edit before locking in:</label>
    <input type="text" id="edit-oneliner-input" class="inline-edit-input" value="${text}">
  `;

  // Insert immediately below selected card
  cardEl.parentNode.insertBefore(editContainer, cardEl.nextSibling);

  // Set locked positioning string
  state.lockedPositioning = text;

  // Listen to input edit changes
  const editInput = editContainer.querySelector("#edit-oneliner-input");
  editInput.addEventListener("input", (e) => {
    state.lockedPositioning = e.target.value.trim();
  });

  // Enable the submit button for Step 2
  const nextBtn = document.getElementById("btn-generate-promo");
  if (nextBtn) {
    nextBtn.disabled = false;
  }
}

/**
 * Handles Step 2 submit: locking message, showing Step 3 skeletons, running Gemini copy kit call.
 */
async function handleStep2Submit() {
  const nextBtn = document.getElementById("btn-generate-promo");
  if (nextBtn) nextBtn.disabled = true;

  // Double check we have selected positioning
  const finalInput = document.getElementById("edit-oneliner-input");
  if (finalInput) {
    state.lockedPositioning = finalInput.value.trim();
  }

  if (!state.lockedPositioning) {
    showError("Please enter or select a one-liner.");
    if (nextBtn) nextBtn.disabled = false;
    return;
  }

  // Update stepper to Step 3
  updateStepper(3);

  // Render Skeletons in promo workspace
  document.getElementById("promo-kit-workspace").innerHTML = "";
  document.getElementById("promo-kit-workspace").style.display = "none";
  renderSkeleton("promo-kit-workspace", 4);

  try {
    const data = await fetchPromoKit(state.lockedPositioning, state.formData);
    state.promoKitData = data;

    clearSkeleton("promo-kit-workspace");
    renderPromoKit(data, state.formData.appName);
    showSuccess("Promo kit generated successfully!");
  } catch (err) {
    console.error("Step 2 API Error: ", err);
    clearSkeleton("promo-kit-workspace");
    document.getElementById("promo-kit-workspace").style.display = "none";
    updateStepper(2);
    if (nextBtn) nextBtn.disabled = false;
    showError(err.message || "An unexpected error occurred.", err.status);
  }
}

/**
 * Resets the entire application back to Step 1.
 */
function resetApp() {
  const container = document.getElementById("tool");
  
  // Fade out current views
  container.classList.add("fade-out-anim");
  
  setTimeout(() => {
    // Clear state
    state.formData = null;
    state.positioningData = null;
    state.selectedOneliner = null;
    state.lockedPositioning = null;
    state.promoKitData = null;
    state.currentStep = 1;

    // Reset Form
    document.getElementById("step-1-form").reset();
    
    // Reset Character Counter
    const charCounter = document.getElementById("desc-char-count");
    if (charCounter) {
      charCounter.textContent = "0 / 400";
      charCounter.className = "char-counter";
    }

    // Enable Form Inputs
    setFormInputsDisabled(false);

    // Hide Step 2 & 3
    document.getElementById("positioning-workspace").innerHTML = "";
    document.getElementById("positioning-workspace").style.display = "none";
    document.getElementById("promo-kit-workspace").innerHTML = "";
    document.getElementById("promo-kit-workspace").style.display = "none";

    // Reset Stepper
    updateStepper(1);
    checkFormCompleteness();

    // Fade in
    container.classList.remove("fade-out-anim");
    container.classList.add("fade-in");
    setTimeout(() => {
      container.classList.remove("fade-in");
    }, 300);

    // Scroll to tool
    document.getElementById("tool").scrollIntoView({ behavior: "smooth" });
  }, 300);
}
