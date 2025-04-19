document.addEventListener("DOMContentLoaded", function () {
  const domainSelect = document.getElementById("domain-select");
  const jobTitleInput = document.getElementById("job-title");
  const locationInput = document.getElementById("location");
  const timeMinutesInput = document.getElementById("time-minutes");
  const searchButton = document.getElementById("search-button");
  const statusDiv = document.getElementById("status");
  const queryHelper = document.getElementById("query-helper");
  const hidePromotedToggle = document.getElementById("hide-promoted-toggle");
  const hideViewedToggle = document.getElementById("hide-viewed-toggle");
  const hideEasyApplyToggle = document.getElementById("hide-easy-apply-toggle");
  const blockedCompaniesList = document.getElementById(
    "blocked-companies-list"
  );
  const clearAllCompaniesBtn = document.getElementById("clear-all-companies");
  const toggleBlockedSectionBtn = document.getElementById(
    "toggle-blocked-section"
  );
  const blockedCompaniesContent = document.getElementById(
    "blocked-companies-content"
  );
  const timeHoursDisplay = document.getElementById("time-hours-display");

  let blockedCompanies = [];

  toggleBlockedSectionBtn.addEventListener("click", function () {
    blockedCompaniesContent.classList.toggle("collapsed");
    toggleBlockedSectionBtn.textContent =
      blockedCompaniesContent.classList.contains("collapsed") ? "▶" : "▼";
  });

  chrome.storage.sync.get(
    {
      hidePromoted: false,
      hideViewed: false,
      hideEasyApply: false,
      blockedCompanies: [],
    },
    function (items) {
      hidePromotedToggle.checked = items.hidePromoted;
      hideViewedToggle.checked = items.hideViewed;
      hideEasyApplyToggle.checked = items.hideEasyApply;
      blockedCompanies = items.blockedCompanies || [];
      renderBlockedCompanies();
    }
  );

  function renderBlockedCompanies() {
    blockedCompaniesList.innerHTML = "";

    if (blockedCompanies.length === 0) {
      const noCompaniesMsg = document.createElement("div");
      noCompaniesMsg.className = "no-companies-message";
      noCompaniesMsg.textContent = "No companies blocked yet";
      blockedCompaniesList.appendChild(noCompaniesMsg);
      return;
    }

    blockedCompanies.forEach((company) => {
      const companyItem = document.createElement("div");
      companyItem.className = "blocked-company-item";

      const companyName = document.createElement("div");
      companyName.className = "company-name";
      companyName.textContent = company;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-company-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removeBlockedCompany(company));

      companyItem.appendChild(companyName);
      companyItem.appendChild(removeBtn);
      blockedCompaniesList.appendChild(companyItem);
    });
  }

  function removeBlockedCompany(company) {
    blockedCompanies = blockedCompanies.filter((c) => c !== company);

    chrome.storage.sync.set(
      { blockedCompanies: blockedCompanies },
      function () {
        console.log(`Removed ${company} from blocked companies`);
        renderBlockedCompanies();
      }
    );
  }

  timeMinutesInput.addEventListener("input", function () {
    const minutes = parseInt(this.value);
    if (!isNaN(minutes) && minutes > 0) {
      const hours = (minutes / 60).toFixed(1);
      timeHoursDisplay.textContent = ` = ${hours} hr${
        hours !== "1.0" ? "s" : ""
      }`;
    } else {
      timeHoursDisplay.textContent = "";
    }
  });

  clearAllCompaniesBtn.addEventListener("click", function () {
    if (blockedCompanies.length === 0) return;

    if (confirm("Are you sure you want to clear all blocked companies?")) {
      blockedCompanies = [];
      chrome.storage.sync.set({ blockedCompanies: [] }, function () {
        console.log("Cleared all blocked companies");
        renderBlockedCompanies();
      });
    }
  });

  hidePromotedToggle.addEventListener("change", function () {
    try {
      chrome.storage.sync.set({ hidePromoted: hidePromotedToggle.checked });
    } catch (e) {
      console.error("Error saving hidePromoted setting:", e);
      statusDiv.textContent = "Error saving settings. Please try again.";
    }
  });

  hideViewedToggle.addEventListener("change", function () {
    try {
      chrome.storage.sync.set({ hideViewed: hideViewedToggle.checked });
    } catch (e) {
      console.error("Error saving hideViewed setting:", e);
      statusDiv.textContent = "Error saving settings. Please try again.";
    }
  });

  hideEasyApplyToggle.addEventListener("change", function () {
    try {
      chrome.storage.sync.set({ hideEasyApply: hideEasyApplyToggle.checked });
    } catch (e) {
      console.error("Error saving hideEasyApply setting:", e);
      statusDiv.textContent = "Error saving settings. Please try again.";
    }
  });

  const domainQueries = {
    software:
      '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("software" OR "software engineering" OR "software development" OR "full stack" OR "front end" OR "back end" OR "mobile" OR "app development" OR "web development")',
    devops:
      '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("devops" OR "cloud" OR "infrastructure" OR "site reliability" OR "SRE" OR "CI/CD" OR "platform engineering" OR "systems")',
    product:
      '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("product management" OR "product manager" OR "product owner" OR "PM" OR "APM" OR "associate product")',
    data: '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("data science" OR "data scientist" OR "machine learning" OR "ML" OR "AI" OR "analytics" OR "data analyst" OR "data engineering" OR "big data")',
    security:
      '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("cybersecurity" OR "security" OR "information security" OR "infosec" OR "network security" OR "application security" OR "security operations" OR "pentesting")',
    ux: '("intern" OR "internship" OR "co-op" OR "cooperative") AND ("UX" OR "UI" OR "user experience" OR "user interface" OR "design" OR "interaction design" OR "visual design" OR "product design")',
  };

  domainSelect.addEventListener("change", function () {
    const domain = domainSelect.value;

    if (domain === "custom") {
      jobTitleInput.value = "";
      jobTitleInput.placeholder = "Enter your custom search query";
      jobTitleInput.disabled = false;
      queryHelper.textContent = "Enter your custom search terms";
    } else {
      jobTitleInput.value = domainQueries[domain];
      jobTitleInput.disabled = true;
      queryHelper.textContent =
        "Pre-defined search query for " +
        domainSelect.options[domainSelect.selectedIndex].text;
    }
  });

  searchButton.addEventListener("click", function () {
    const jobTitle = jobTitleInput.value.trim();
    const location = locationInput.value.trim();
    const timeMinutes = timeMinutesInput.value.trim();

    if (!jobTitle) {
      statusDiv.textContent = "Please enter a search query or select a domain";
      jobTitleInput.focus();
      return;
    }

    let timeParamValue = "";
    if (timeMinutes && !isNaN(timeMinutes) && parseInt(timeMinutes) > 0) {
      const timeInSeconds = parseInt(timeMinutes) * 60;
      timeParamValue = `&f_TPR=r${timeInSeconds}`;
    }

    let searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
      jobTitle
    )}`;

    if (location) {
      searchUrl += `&location=${encodeURIComponent(location)}`;
    }

    if (timeParamValue) {
      searchUrl += timeParamValue;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.update({ url: searchUrl });
      window.close();
    });
  });

  try {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0].url.includes("linkedin.com")) return;

      const url = new URL(tabs[0].url);
      const params = new URLSearchParams(url.search);

      if (params.has("keywords")) {
        const keywords = params.get("keywords").replace(/%22/g, '"');
        jobTitleInput.value = keywords;

        for (const [domain, query] of Object.entries(domainQueries)) {
          if (keywords === query) {
            domainSelect.value = domain;
            jobTitleInput.disabled = true;
            queryHelper.textContent =
              "Pre-defined search query for " +
              domainSelect.options[domainSelect.selectedIndex].text;
            break;
          }
        }
      }

      if (params.has("location")) {
        locationInput.value = params.get("location").replace(/%22/g, '"');
      }

      if (params.has("f_TPR") && params.get("f_TPR").startsWith("r")) {
        const seconds = params.get("f_TPR").substring(1);
        const minutes = Math.floor(parseInt(seconds) / 60);
        if (!isNaN(minutes)) {
          timeMinutesInput.value = minutes;
        }
      }
    });
  } catch (e) {
    console.error("Error parsing URL:", e);
  }
});
