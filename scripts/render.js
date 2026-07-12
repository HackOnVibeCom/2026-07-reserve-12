/**
 * Updates the visual state of the stepper.
 * @param {number} step - 1, 2, or 3
 */
function updateStepper(step) {
  const steps = [1, 2, 3];
  
  steps.forEach(s => {
    const item = document.getElementById(`step-item-${s}`);
    const circle = item.querySelector(".step-circle");
    const numSpan = item.querySelector(".step-num");
    const label = item.querySelector(".step-label");
    
    if (s < step) {
      // Completed step
      item.classList.add("completed");
      item.classList.remove("active", "upcoming");
      circle.innerHTML = "✓";
      label.style.textDecoration = "line-through";
    } else if (s === step) {
      // Current step
      item.classList.add("active");
      item.classList.remove("completed", "upcoming");
      circle.innerHTML = `<span class="step-num">${s}</span>`;
      label.style.textDecoration = "none";
    } else {
      // Upcoming step
      item.classList.add("upcoming");
      item.classList.remove("completed", "active");
      circle.innerHTML = `<span class="step-num">${s}</span>`;
      label.style.textDecoration = "none";
    }
  });

  // Update connectors
  const connector1 = document.getElementById("connector-1");
  const connector2 = document.getElementById("connector-2");

  if (step > 1) {
    connector1.classList.add("active");
  } else {
    connector1.classList.remove("active");
  }

  if (step > 2) {
    connector2.classList.add("active");
  } else {
    connector2.classList.remove("active");
  }
}

/**
 * Renders skeleton loader cards inside a container.
 * @param {string} containerId 
 * @param {number} cardCount 
 */
function renderSkeleton(containerId, cardCount) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  container.style.display = "block";

  const skeletonWrapper = document.createElement("div");
  skeletonWrapper.className = "skeleton-wrapper fade-in";

  for (let i = 0; i < cardCount; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    
    // Add staggered animation delay
    card.style.animationDelay = `${i * 0.1}s`;

    card.innerHTML = `
      <div class="skeleton-header">
        <div class="skeleton-title shimmer"></div>
        <div class="skeleton-badge shimmer"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line shimmer" style="width: 90%"></div>
        <div class="skeleton-line shimmer" style="width: 75%"></div>
        <div class="skeleton-line shimmer" style="width: 60%"></div>
      </div>
    `;
    skeletonWrapper.appendChild(card);
  }

  container.appendChild(skeletonWrapper);
}

/**
 * Clears skeleton loader from container.
 * @param {string} containerId 
 */
function clearSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }
}

/**
 * Renders Step 2 (Positioning Workspace) in the DOM.
 * @param {object} data 
 */
function renderPositioning(data) {
  const container = document.getElementById("positioning-workspace");
  if (!container) return;

  container.innerHTML = "";
  container.style.display = "block";

  // Create workspace elements
  const heading = document.createElement("h2");
  heading.className = "step-title font-display";
  heading.textContent = "Lock Your Positioning";

  const sub = document.createElement("p");
  sub.className = "step-subtitle";
  sub.textContent = "Select a core one-liner, adjust it if needed, and prepare your copy launchpad.";

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "one-liner-list";

  // Render 5 cards
  data.oneliners.forEach((oneliner, index) => {
    const card = document.createElement("div");
    card.className = "one-liner-card fade-slide-up";
    card.style.animationDelay = `${index * 0.05}s`;
    card.dataset.index = index;

    card.innerHTML = `
      <span class="one-liner-angle-badge">${oneliner.angle}</span>
      <p class="one-liner-text font-display">${oneliner.text}</p>
    `;

    card.addEventListener("click", () => handleCardSelect(index, oneliner.text, card));
    cardsContainer.appendChild(card);
  });

  // App Store Subtitle Box
  const subtitleBox = document.createElement("div");
  subtitleBox.className = "subtitle-box fade-slide-up";
  subtitleBox.style.animationDelay = "0.3s";
  
  const initialSubtitleLen = data.app_store_subtitle.length;
  subtitleBox.innerHTML = `
    <div class="box-header">
      <div class="box-label-group">
        <span class="box-label">App Store Subtitle</span>
        <span id="subtitle-char-count" class="char-badge ${initialSubtitleLen > 30 ? 'exceeded' : ''}">${initialSubtitleLen}/30 chars</span>
      </div>
      <button class="icon-copy-btn" title="Copy Subtitle">🗐 Copy</button>
    </div>
    <input type="text" id="app-store-subtitle-input" class="subtitle-input" value="${data.app_store_subtitle}" placeholder="Under 30 chars exactly">
  `;

  // Bind input listener for live character counting
  const subtitleInput = subtitleBox.querySelector("#app-store-subtitle-input");
  const charBadge = subtitleBox.querySelector("#subtitle-char-count");
  subtitleInput.addEventListener("input", (e) => {
    const len = e.target.value.length;
    charBadge.textContent = `${len}/30 chars`;
    if (len > 30) {
      charBadge.classList.add("exceeded");
    } else {
      charBadge.classList.remove("exceeded");
    }
  });

  // Bind copy button listener
  const copyBtn = subtitleBox.querySelector(".icon-copy-btn");
  copyBtn.addEventListener("click", () => {
    copyToClipboard(subtitleInput.value, copyBtn);
  });

  // Tip & Keyword & Subreddit container
  const footerDetails = document.createElement("div");
  footerDetails.className = "footer-details-grid fade-slide-up";
  footerDetails.style.animationDelay = "0.35s";

  // Tip
  const tipSection = document.createElement("div");
  tipSection.className = "tip-section card-detail";
  tipSection.innerHTML = `
    <h4 class="detail-title font-display">💡 Positioning Strategy Tip</h4>
    <p class="tip-text">${data.positioning_tip}</p>
  `;

  // Keywords
  const keywordsSection = document.createElement("div");
  keywordsSection.className = "keywords-section card-detail";
  
  let keywordTags = "";
  data.suggested_keywords.forEach(kw => {
    keywordTags += `<span class="violet-pill-tag">${kw}</span>`;
  });

  keywordsSection.innerHTML = `
    <h4 class="detail-title font-display">🔍 Suggested ASO Keywords</h4>
    <div class="pill-row">${keywordTags}</div>
  `;

  // Subreddits
  const subredditsSection = document.createElement("div");
  subredditsSection.className = "subreddits-section card-detail";
  
  let subredditTags = "";
  data.target_subreddits.forEach(sub => {
    subredditTags += `<span class="reddit-pill-tag">${sub}</span>`;
  });

  subredditsSection.innerHTML = `
    <h4 class="detail-title font-display">👾 Best Subreddits to Post In</h4>
    <div class="pill-row">${subredditTags}</div>
  `;

  footerDetails.appendChild(tipSection);
  footerDetails.appendChild(keywordsSection);
  footerDetails.appendChild(subredditsSection);

  // Submit Button
  const submitContainer = document.createElement("div");
  submitContainer.className = "submit-container fade-slide-up";
  submitContainer.style.animationDelay = "0.4s";

  const nextBtn = document.createElement("button");
  nextBtn.id = "btn-generate-promo";
  nextBtn.className = "btn btn-primary pulse-glow btn-full";
  nextBtn.innerHTML = "✦ Generate My Promo Kit →";
  nextBtn.disabled = true; // Enabled when card is selected
  nextBtn.addEventListener("click", handleStep2Submit);

  submitContainer.appendChild(nextBtn);

  // Assemble Step 2 UI
  container.appendChild(heading);
  container.appendChild(sub);
  container.appendChild(cardsContainer);
  container.appendChild(subtitleBox);
  container.appendChild(footerDetails);
  container.appendChild(submitContainer);

  // Smooth scroll to results
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Renders Step 3 (Promotional Copy Kit) in the DOM.
 * @param {object} data 
 * @param {string} appName 
 */
function renderPromoKit(data, appName) {
  const container = document.getElementById("promo-kit-workspace");
  if (!container) return;

  container.innerHTML = "";
  container.style.display = "block";

  const heading = document.createElement("h2");
  heading.className = "step-title font-display";
  heading.textContent = "🎯 Your Launch Promo Kit";

  const sub = document.createElement("p");
  sub.className = "step-subtitle";
  sub.textContent = `Everything you need to announce ${appName} — copy any piece with one click.`;

  const grid = document.createElement("div");
  grid.className = "promo-kit-grid";

  // Card 1 — App Store Description
  const card1 = document.createElement("div");
  card1.className = "promo-card fade-slide-up";
  card1.style.animationDelay = "0.05s";
  const descWordCount = data.app_store_description.split(/\s+/).filter(Boolean).length;
  card1.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">📱 App Store Description</h3>
      <div class="promo-card-actions">
        <span class="word-count-badge">${descWordCount} words</span>
        <button class="copy-btn copy-kit-btn">Copy</button>
      </div>
    </div>
    <div class="promo-card-body whitespace-pre">${data.app_store_description}</div>
  `;
  card1.querySelector(".copy-kit-btn").addEventListener("click", (e) => {
    copyToClipboard(data.app_store_description, e.target);
  });
  grid.appendChild(card1);

  // Card 2 — Tweet Variations
  const card2 = document.createElement("div");
  card2.className = "promo-card fade-slide-up";
  card2.style.animationDelay = "0.1s";
  
  let tweetsHtml = "";
  data.tweets.forEach((tweet, i) => {
    const count = tweet.text.length;
    let badgeClass = "";
    if (count > 240) badgeClass = "exceeded";
    else if (count > 220) badgeClass = "warning";
    
    tweetsHtml += `
      <div class="tweet-subcard">
        <div class="tweet-subcard-header">
          <span class="tweet-style-badge">${tweet.style}</span>
          <button class="copy-btn mini-copy-btn" data-tweet-idx="${i}">Copy</button>
        </div>
        <p class="tweet-text">${tweet.text}</p>
        <span class="char-count-badge ${badgeClass}">${count} / 240</span>
      </div>
    `;
  });

  card2.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">🐦 Tweet Variations</h3>
    </div>
    <div class="promo-card-body flex-column">${tweetsHtml}</div>
  `;

  card2.querySelectorAll(".mini-copy-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.tweetIdx;
      copyToClipboard(data.tweets[idx].text, e.target);
    });
  });
  grid.appendChild(card2);

  // Card 3 — Reddit Post
  const card3 = document.createElement("div");
  card3.className = "promo-card fade-slide-up";
  card3.style.animationDelay = "0.15s";
  
  // Suggested subreddits (using subreddits from state.positioningData)
  let subredditsHtml = "";
  if (state.positioningData && state.positioningData.target_subreddits) {
    state.positioningData.target_subreddits.forEach(sub => {
      subredditsHtml += `<span class="reddit-pill-tag">${sub}</span>`;
    });
  }

  card3.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">👾 Reddit Post</h3>
      <button class="copy-btn copy-reddit-btn">Copy Post</button>
    </div>
    <div class="promo-card-body">
      <div class="reddit-title-label">TITLE</div>
      <div class="reddit-post-title font-display">${data.reddit_post.title}</div>
      <div class="reddit-body-label">BODY</div>
      <div class="reddit-post-body whitespace-pre">${data.reddit_post.body}</div>
      <div class="reddit-suggestions">
        <span class="suggestions-label">Suggested communities:</span>
        <div class="pill-row">${subredditsHtml}</div>
      </div>
    </div>
  `;
  card3.querySelector(".copy-reddit-btn").addEventListener("click", (e) => {
    const rawRedditText = `Title: ${data.reddit_post.title}\n\n${data.reddit_post.body}`;
    copyToClipboard(rawRedditText, e.target);
  });
  grid.appendChild(card3);

  // Card 4 — Product Hunt Tagline
  const card4 = document.createElement("div");
  card4.className = "promo-card fade-slide-up";
  card4.style.animationDelay = "0.2s";
  const taglineCharCount = data.product_hunt_tagline.length;
  card4.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">🚀 Product Hunt Tagline</h3>
      <div class="promo-card-actions">
        <span class="char-count-badge ${taglineCharCount > 60 ? 'exceeded' : ''}">${taglineCharCount} / 60</span>
        <button class="copy-btn copy-ph-btn">Copy</button>
      </div>
    </div>
    <div class="promo-card-body text-center font-display tagline-highlight">
      "${data.product_hunt_tagline}"
    </div>
  `;
  card4.querySelector(".copy-ph-btn").addEventListener("click", (e) => {
    copyToClipboard(data.product_hunt_tagline, e.target);
  });
  grid.appendChild(card4);

  // Card 5 — LinkedIn Post
  const card5 = document.createElement("div");
  card5.className = "promo-card fade-slide-up";
  card5.style.animationDelay = "0.25s";
  const liWordCount = data.linkedin_post.split(/\s+/).filter(Boolean).length;
  card5.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">💼 LinkedIn Post</h3>
      <div class="promo-card-actions">
        <span class="word-count-badge">${liWordCount} words</span>
        <button class="copy-btn copy-li-btn">Copy</button>
      </div>
    </div>
    <div class="promo-card-body whitespace-pre">${data.linkedin_post}</div>
  `;
  card5.querySelector(".copy-li-btn").addEventListener("click", (e) => {
    copyToClipboard(data.linkedin_post, e.target);
  });
  grid.appendChild(card5);

  // Card 6 — Email Subject Lines
  const card6 = document.createElement("div");
  card6.className = "promo-card fade-slide-up";
  card6.style.animationDelay = "0.3s";
  
  const emailLabels = ["Curiosity", "Benefit", "Personal"];
  let emailHtml = "";
  data.email_subject_lines.forEach((line, idx) => {
    const label = emailLabels[idx] || "Subject";
    emailHtml += `
      <div class="email-subcard">
        <span class="email-style-badge">${label}</span>
        <div class="email-row">
          <span class="email-line-text">"${line}"</span>
          <button class="copy-btn mini-copy-btn" data-email-idx="${idx}">Copy</button>
        </div>
      </div>
    `;
  });

  card6.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">📧 Launch Email Subject Lines</h3>
    </div>
    <div class="promo-card-body flex-column">${emailHtml}</div>
  `;
  card6.querySelectorAll(".mini-copy-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.emailIdx;
      copyToClipboard(data.email_subject_lines[idx], e.target);
    });
  });
  grid.appendChild(card6);

  // Card 7 — Press Hook
  const card7 = document.createElement("div");
  card7.className = "promo-card fade-slide-up";
  card7.style.animationDelay = "0.35s";
  card7.innerHTML = `
    <div class="promo-card-header">
      <h3 class="promo-card-title font-display">📰 Press / PR Hook</h3>
      <button class="copy-btn copy-press-btn">Copy</button>
    </div>
    <div class="promo-card-body">
      <p class="press-hook-subtext">Use this as the opening paragraph when pitching journalists or writing your press release.</p>
      <p class="press-hook-content">${data.press_hook}</p>
    </div>
  `;
  card7.querySelector(".copy-press-btn").addEventListener("click", (e) => {
    copyToClipboard(data.press_hook, e.target);
  });
  grid.appendChild(card7);

  // Export panel
  const exportPanel = document.createElement("div");
  exportPanel.className = "export-panel fade-slide-up";
  exportPanel.style.animationDelay = "0.4s";
  exportPanel.innerHTML = `
    <h3 class="export-title font-display">📦 Export Your Kit</h3>
    <p class="export-subtext">Download everything as a single text file to save, share, or hand to a team member.</p>
    <div class="export-actions">
      <button id="btn-download-kit" class="btn btn-primary">⬇ Download as .txt</button>
      <button id="btn-start-over" class="btn btn-outline">🔄 Start Over</button>
    </div>
  `;

  exportPanel.querySelector("#btn-download-kit").addEventListener("click", () => {
    const textContent = generateTxtExport(data, appName);
    downloadTxt(textContent, `praeco-${appName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-launch-kit.txt`);
  });

  exportPanel.querySelector("#btn-start-over").addEventListener("click", resetApp);

  container.appendChild(heading);
  container.appendChild(sub);
  container.appendChild(grid);
  container.appendChild(exportPanel);

  // Smooth scroll to results
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Creates and shows a dynamic alert toast.
 * @param {string} message 
 * @param {number} [status] 
 */
function showError(message, status) {
  let display = message;
  if (status === 400) display = "Invalid request. Check your inputs and try again.";
  if (status === 403) display = "Invalid API key. Update API_KEY in api.js.";
  if (status === 429) display = "Rate limit hit. Wait a moment and try again.";
  if (status >= 500) display = "Gemini is busy right now. Try again in a few seconds.";

  createToast(display, "error", 4000);
}

/**
 * Shows a success toast.
 * @param {string} message 
 */
function showSuccess(message) {
  createToast(message, "success", 3000);
}

function createToast(message, type, duration) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : "⚠"}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  // Trigger animation next frame
  requestAnimationFrame(() => {
    toast.classList.remove("toast-enter");
    toast.classList.add("toast-show");
  });

  // Set timeout to dismiss
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, duration);
}
