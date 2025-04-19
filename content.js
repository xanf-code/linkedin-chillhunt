console.log("LinkedIn Jobs Helper content script loaded");

let hidePromoted = false;
let hideViewed = false;
let hideEasyApply = false;
let blockedCompanies = [];
let debugMode = false;

function debug(message) {
  if (debugMode) {
    console.log(`LinkedIn Jobs Helper Debug: ${message}`);
  }
}

window.toggleLinkedInJobsHelperDebug = function () {
  debugMode = !debugMode;
  console.log(`LinkedIn Jobs Helper Debug Mode: ${debugMode ? "ON" : "OFF"}`);
  if (debugMode) {
    console.log("To turn off debug mode, run: toggleLinkedInJobsHelperDebug()");
    console.log(
      `Current settings: hidePromoted=${hidePromoted}, hideViewed=${hideViewed}, hideEasyApply=${hideEasyApply}`
    );
    console.log(`Blocked companies: ${JSON.stringify(blockedCompanies)}`);
    scanJobCards();
  }
};

function addBlockButtons() {
  const jobCards = document.querySelectorAll(
    "li.ember-view.occludable-update[data-occludable-job-id], li.scaffold-layout__list-item[data-occludable-job-id]"
  );

  jobCards.forEach((card, index) => {
    try {
      if (card.querySelector(".ch-block-btn")) {
        return;
      }

      const companyElement =
        card.querySelector(".artdeco-entity-lockup__subtitle") ||
        card.querySelector(".job-card-container__company-name") ||
        card.querySelector("[data-test-job-card-company-name]");

      if (!companyElement) return;

      const companyName = companyElement.textContent.trim();
      if (!companyName) return;

      const blockButton = document.createElement("button");
      blockButton.className = "ch-block-btn";
      blockButton.setAttribute("aria-label", `Block ${companyName}`);
      blockButton.setAttribute("type", "button");

      blockButton.style.cssText = `
        position: absolute;
        bottom: 12px;
        right: 12px;
        z-index: 9999;
        width: 32px;
        height: 32px;
        background-color: #ff5c5c;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.9;
        transition: all 0.2s ease;
      `;

      blockButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      `;

      blockButton.onmouseover = function () {
        this.style.opacity = "1";
        this.style.transform = "scale(1.1)";
      };

      blockButton.onmouseout = function () {
        this.style.opacity = "0.9";
        this.style.transform = "scale(1)";
      };

      blockButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        blockCompany(companyName, card);
      });

      if (window.getComputedStyle(card).position === "static") {
        card.style.position = "relative";
      }

      card.appendChild(blockButton);
      console.log(`Added block button for ${companyName} to card ${index}`);
    } catch (e) {
      console.error(`Error adding block button to card ${index}: ${e.message}`);
    }
  });
}

function blockCompany(companyName, card) {
  if (!blockedCompanies.includes(companyName)) {
    blockedCompanies.push(companyName);
    debug(`Blocked company: ${companyName}`);

    chrome.storage.sync.set(
      { blockedCompanies: blockedCompanies },
      function () {
        debug("Blocked companies list saved");
      }
    );

    if (card) {
      card.style.display = "none";
    }

    applyJobFilters();
  }
}

function scanJobCards() {
  const jobCards = document.querySelectorAll(
    "li.ember-view.occludable-update, li.scaffold-layout__list-item"
  );
  console.log(`Found ${jobCards.length} job cards on page`);

  if (jobCards.length > 0) {
    jobCards.forEach((card, index) => {
      if (index < 3) {
        console.log(`Job Card #${index + 1}:`);

        const footerItems = card.querySelectorAll(
          ".job-card-container__footer-item"
        );
        let hasPromoted = false;
        footerItems.forEach((item) => {
          const text = item.textContent.trim();
          if (text.includes("Promoted")) {
            hasPromoted = true;
            console.log(`- Has "Promoted" tag: Yes (Text: "${text}")`);
          }
        });
        if (!hasPromoted) {
          console.log('- Has "Promoted" tag: No');
        }

        const viewedElement = card.querySelector(
          ".job-card-container__footer-job-state"
        );
        if (viewedElement) {
          console.log(
            `- Has "Viewed" tag: ${
              viewedElement.textContent.trim() === "Viewed" ? "Yes" : "No"
            } (Text: "${viewedElement.textContent.trim()}")`
          );
        } else {
          console.log('- Has "Viewed" tag: No (element not found)');
        }

        const easyApplyElement = card.querySelector(
          'span[data-test-icon="linkedin-bug-color-small"], span.artdeco-inline-feedback__message, span[aria-hidden="true"]:contains("Easy Apply")'
        );
        if (easyApplyElement) {
          console.log(`- Has "Easy Apply": Yes`);
        } else {
          console.log('- Has "Easy Apply": No (element not found)');
        }

        const companyElement = card.querySelector(
          ".artdeco-entity-lockup__subtitle"
        );
        if (companyElement) {
          const companyName = companyElement.textContent.trim();
          console.log(`- Company: ${companyName}`);
          console.log(`- Blocked: ${blockedCompanies.includes(companyName)}`);
        }

        const dismissButton = card.querySelector(
          'button[aria-label*="Dismiss"], button[aria-label*="dismiss"]'
        );
        console.log(`- Dismiss button found: ${dismissButton ? "Yes" : "No"}`);
        if (dismissButton) {
          console.log(`  - Button classes: ${dismissButton.className}`);
          console.log(`  - Button parent: ${dismissButton.parentNode.tagName}`);
        }
      }
    });
  }
}

function applyJobFilters() {
  try {
    const jobCards = document.querySelectorAll(
      "li.ember-view.occludable-update, li.scaffold-layout__list-item"
    );
    debug(`Processing ${jobCards.length} job cards`);

    let hiddenCount = 0;
    jobCards.forEach((card, index) => {
      try {
        let shouldHide = false;
        let reason = "";

        if (!shouldHide && blockedCompanies.length > 0) {
          try {
            const companyElement = card.querySelector(
              ".artdeco-entity-lockup__subtitle"
            );
            if (companyElement) {
              const companyName = companyElement.textContent.trim();
              if (blockedCompanies.includes(companyName)) {
                shouldHide = true;
                reason = "blocked company";
              }
            }
          } catch (e) {
            debug(`Error checking blocked company status: ${e.message}`);
          }
        }

        if (!shouldHide && hidePromoted) {
          const footerItems = card.querySelectorAll(
            ".job-card-container__footer-item"
          );
          footerItems.forEach((item) => {
            try {
              const text = item.textContent.trim();
              if (text.includes("Promoted")) {
                shouldHide = true;
                reason = "promoted";
              }
            } catch (e) {
              debug(`Error checking promoted status: ${e.message}`);
            }
          });
        }

        if (!shouldHide && hideViewed) {
          try {
            const viewedElement = card.querySelector(
              ".job-card-container__footer-job-state"
            );
            if (
              viewedElement &&
              viewedElement.textContent.trim() === "Viewed"
            ) {
              shouldHide = true;
              reason = "viewed";
            }
          } catch (e) {
            debug(`Error checking viewed status: ${e.message}`);
          }
        }

        if (!shouldHide && hideEasyApply) {
          try {
            const easyApplyButton = card.querySelector(
              'button[aria-label="Easy Apply"], span[data-test-icon="linkedin-bug-color-small"]'
            );

            const easyApplyText = card.textContent.includes("Easy Apply");

            const easyApplySpan = Array.from(
              card.querySelectorAll("span")
            ).some((span) => span.textContent.trim() === "Easy Apply");

            if (easyApplyButton || easyApplyText || easyApplySpan) {
              shouldHide = true;
              reason = "easy apply";
            }
          } catch (e) {
            debug(`Error checking easy apply status: ${e.message}`);
          }
        }

        if (shouldHide) {
          card.style.display = "none";
          hiddenCount++;
          debug(`Hiding job #${index + 1} (reason: ${reason})`);
        } else {
          card.style.display = "";
        }
      } catch (e) {
        debug(`Error processing job card ${index}: ${e.message}`);
      }
    });

    debug(`Hidden ${hiddenCount} of ${jobCards.length} jobs`);
  } catch (e) {
    console.error(`LinkedIn Jobs Helper error: ${e.message}`);
  }

  setTimeout(addBlockButtons, 100);
}

function loadSettings() {
  try {
    chrome.storage.sync.get(
      {
        hidePromoted: false,
        hideViewed: false,
        hideEasyApply: false,
        blockedCompanies: [],
      },
      function (items) {
        try {
          hidePromoted = items.hidePromoted;
          hideViewed = items.hideViewed;
          hideEasyApply = items.hideEasyApply;
          blockedCompanies = items.blockedCompanies || [];
          debug(
            `Settings loaded: hidePromoted=${hidePromoted}, hideViewed=${hideViewed}, hideEasyApply=${hideEasyApply}`
          );
          debug(
            `Blocked companies loaded: ${JSON.stringify(blockedCompanies)}`
          );

          if (
            hidePromoted ||
            hideViewed ||
            hideEasyApply ||
            blockedCompanies.length > 0
          ) {
            applyJobFilters();
          } else {
            setTimeout(addBlockButtons, 100);
          }
        } catch (e) {
          console.error(
            `LinkedIn Jobs Helper error loading settings: ${e.message}`
          );
        }
      }
    );
  } catch (e) {
    console.error(
      `LinkedIn Jobs Helper failed to access storage: ${e.message}`
    );
  }
}

function setupObserver() {
  try {
    const jobListContainer = document.querySelector(
      ".jobs-search-results-list, .scaffold-layout__list"
    );

    if (jobListContainer) {
      debug("Job list container found, setting up observer");

      const observer = new MutationObserver(function (mutations) {
        try {
          if (
            hidePromoted ||
            hideViewed ||
            hideEasyApply ||
            blockedCompanies.length > 0
          ) {
            setTimeout(applyJobFilters, 100);
          } else {
            setTimeout(addBlockButtons, 100);
          }
        } catch (e) {
          debug(`Observer callback error: ${e.message}`);
        }
      });

      observer.observe(jobListContainer, {
        childList: true,
        subtree: true,
      });

      debug("Observer successfully attached");

      if (
        hidePromoted ||
        hideViewed ||
        hideEasyApply ||
        blockedCompanies.length > 0
      ) {
        applyJobFilters();
      } else {
        setTimeout(addBlockButtons, 100);
      }
    } else {
      debug("Job list container not found, retrying in 1s");
      setTimeout(setupObserver, 1000);
    }
  } catch (e) {
    console.error(`LinkedIn Jobs Helper observer setup error: ${e.message}`);

    setTimeout(setupObserver, 2000);
  }
}

try {
  chrome.storage.onChanged.addListener(function (changes) {
    try {
      if (changes.hidePromoted) {
        hidePromoted = changes.hidePromoted.newValue;
        debug(`hidePromoted changed to ${hidePromoted}`);
      }
      if (changes.hideViewed) {
        hideViewed = changes.hideViewed.newValue;
        debug(`hideViewed changed to ${hideViewed}`);
      }
      if (changes.hideEasyApply) {
        hideEasyApply = changes.hideEasyApply.newValue;
        debug(`hideEasyApply changed to ${hideEasyApply}`);
      }
      if (changes.blockedCompanies) {
        blockedCompanies = changes.blockedCompanies.newValue || [];
        debug(
          `blockedCompanies changed to ${JSON.stringify(blockedCompanies)}`
        );
      }

      applyJobFilters();
    } catch (e) {
      console.error(
        `LinkedIn Jobs Helper settings change handler error: ${e.message}`
      );
    }
  });
} catch (e) {
  console.error(
    `LinkedIn Jobs Helper failed to set up storage listener: ${e.message}`
  );
}

const debounce = (func, wait) => {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), wait);
  };
};

document.addEventListener(
  "scroll",
  debounce(function () {
    try {
      if (
        hidePromoted ||
        hideViewed ||
        hideEasyApply ||
        blockedCompanies.length > 0
      ) {
        applyJobFilters();
      } else {
        addBlockButtons();
      }
    } catch (e) {
      debug(`Scroll handler error: ${e.message}`);
    }
  }, 500)
);

try {
  debug("Initializing LinkedIn Jobs Helper");
  loadSettings();

  if (document.readyState === "complete") {
    setupObserver();
  } else {
    window.addEventListener("load", function () {
      setupObserver();
    });
  }
} catch (e) {
  console.error(`LinkedIn Jobs Helper initialization error: ${e.message}`);
}
