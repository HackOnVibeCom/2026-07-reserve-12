/**
 * Copies a given text to the clipboard and gives visual feedback on the button.
 * @param {string} text 
 * @param {HTMLButtonElement} buttonEl 
 */
function copyToClipboard(text, buttonEl) {
  if (!navigator.clipboard) {
    // Fallback if navigator.clipboard is not available
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showCopyFeedback(buttonEl);
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }
    document.body.removeChild(textarea);
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback(buttonEl);
  }).catch(err => {
    console.error("Could not copy text: ", err);
  });
}

function showCopyFeedback(buttonEl) {
  const originalText = buttonEl.innerHTML;
  const originalBg = buttonEl.style.backgroundColor;
  const originalBorder = buttonEl.style.borderColor;
  const originalColor = buttonEl.style.color;

  buttonEl.innerHTML = "✓ Copied!";
  buttonEl.style.backgroundColor = "var(--accent-success, #10b981)";
  buttonEl.style.borderColor = "var(--accent-success, #10b981)";
  buttonEl.style.color = "#ffffff";
  buttonEl.disabled = true;

  setTimeout(() => {
    buttonEl.innerHTML = originalText;
    buttonEl.style.backgroundColor = originalBg;
    buttonEl.style.borderColor = originalBorder;
    buttonEl.style.color = originalColor;
    buttonEl.disabled = false;
  }, 2000);
}

/**
 * Formats the complete promo kit data as a readable plain text file.
 * @param {object} kitData 
 * @param {string} appName 
 * @returns {string}
 */
function generateTxtExport(kitData, appName) {
  let text = `==================================================
PRAECO LAUNCH KIT FOR ${appName.toUpperCase()}
Generated on ${new Date().toLocaleDateString()}
Tagline: The herald of your launch.
==================================================

`;

  // Section 1: App Store Description
  text += `1. APP STORE DESCRIPTION
--------------------------------------------------
${kitData.app_store_description}

\n\n`;

  // Section 2: Tweets
  text += `2. TWITTER / X VARIATIONS
--------------------------------------------------\n`;
  kitData.tweets.forEach((tweet, i) => {
    text += `[${tweet.style}] (${tweet.text.length} chars):\n${tweet.text}\n\n`;
  });
  text += `\n`;

  // Section 3: Reddit Post
  text += `3. REDDIT POST
--------------------------------------------------
Title: ${kitData.reddit_post.title}

${kitData.reddit_post.body}

\n\n`;

  // Section 4: Product Hunt Tagline
  text += `4. PRODUCT HUNT TAGLINE
--------------------------------------------------
${kitData.product_hunt_tagline}

\n\n`;

  // Section 5: LinkedIn Post
  text += `5. LINKEDIN POST
--------------------------------------------------
${kitData.linkedin_post}

\n\n`;

  // Section 6: Email Subject Lines
  text += `6. EMAIL SUBJECT LINES
--------------------------------------------------\n`;
  const emailLabels = ["Curiosity", "Benefit", "Personal"];
  kitData.email_subject_lines.forEach((line, i) => {
    const label = emailLabels[i] || `Option ${i + 1}`;
    text += `[${label}]: ${line}\n`;
  });
  text += `\n\n`;

  // Section 7: Press Hook
  text += `7. PRESS / PR HOOK
--------------------------------------------------
${kitData.press_hook}

\n==================================================
Praeco · The herald of your launch · Powered by Gemini
==================================================`;

  return text;
}

/**
 * Triggers a browser file download of the text.
 * @param {string} content 
 * @param {string} filename 
 */
function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
