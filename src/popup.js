document.addEventListener("DOMContentLoaded", function () {
  const domainSelect = document.getElementById("domain-select");
  const jobTitleInput = document.getElementById("job-title");
  const searchQueryLabel = document.getElementById("search-query-label");
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
  const aiButtonContainer = document.getElementById("ai-button-container");
  const generateAiButton = document.getElementById("generate-ai-button");

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

  async function generateAIQuery() {
    const userPrompt = jobTitleInput.value.trim();

    if (!userPrompt) {
      statusDiv.textContent =
        "Please enter a job description for AI to help with";
      return;
    }

    statusDiv.textContent = "Generating optimized search query...";
    generateAiButton.disabled = true;
    generateAiButton.textContent = "Generating...";

    try {
      const systemPrompt = `You are a specialized LinkedIn search optimizer. Your task is to help users create effective Boolean search filters for LinkedIn job searching based on the job title and role they provide.
When a user provides a job title and role (e.g., "software engineer internship"), analyze it and generate a Boolean search string with the following characteristics:
Break down the input into:
Position type (internship, full-time, contract, etc.)
Core job function (engineer, analyst, manager, etc.)
Industry/specialty (software, marketing, finance, etc.)
For each component, generate relevant synonyms and alternatives.
Format the output as a proper LinkedIn Boolean search string using:
Parentheses for grouping related terms
"OR" operators between alternatives
"AND" operators between different concept groups
Present the final search string in a code block for easy copying.
For example:
If the user says "software engineer internship or co-op"
Respond with: ("intern" OR "internship" OR "co-op" OR "cooperative") AND ("software" OR "software engineering" OR "software development")
Additional guidelines:
Include industry-specific terminology when relevant
Add quotes around multi-word phrases
Focus only on generating the search string without additional career advice
Only reply with the Boolean search string itself - no additional text, explanations, or comments
Provide nothing but the search string in the response`;

      const payload = {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      };

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();

      let generatedQuery = data.choices[0].message.content.trim();

      if (generatedQuery.startsWith("```") && generatedQuery.endsWith("```")) {
        generatedQuery = generatedQuery
          .substring(3, generatedQuery.length - 3)
          .trim();
      }

      jobTitleInput.value = generatedQuery;
      statusDiv.textContent = "AI-optimized search query generated!";
    } catch (error) {
      console.error("Error generating AI query:", error);
      statusDiv.textContent =
        "Error generating query. Using fallback options...";

      const fallbackQueries = [
        `("${userPrompt}") AND ("entry level" OR "junior" OR "associate")`,
        `"${userPrompt}" AND ("recent graduate" OR "new grad" OR "entry level")`,
        `("${userPrompt}") AND ("internship" OR "co-op" OR "trainee")`,
        `"${userPrompt}" AND ("beginner" OR "junior" OR "starting")`,
        `("${userPrompt}") AND ("graduate program" OR "development program")`,
      ];

      const fallbackQuery =
        fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];
      jobTitleInput.value = fallbackQuery;
    } finally {
      generateAiButton.disabled = false;
      generateAiButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 5 6 10 8 10s8-5 8-10a8 8 0 0 0-8-8Z"></path>
          <path d="M7 11.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path>
          <path d="M17 11.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path>
          <path d="M12 15a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z"></path>
        </svg>
        Generate with AI
      `;
    }
  }

  domainSelect.addEventListener("change", function () {
    const domain = domainSelect.value;

    if (domain === "askAI") {
      // Handle Ask AI option
      searchQueryLabel.textContent = "Ask ChillHuntAI";
      jobTitleInput.value = "";
      jobTitleInput.placeholder = "(Ex: Backend Java Software internship)";
      jobTitleInput.disabled = false;
      queryHelper.textContent = "";
      aiButtonContainer.style.display = "block";
    } else if (domain === "custom") {
      // Handle Custom Query option
      searchQueryLabel.textContent = "Search Query";
      jobTitleInput.value = "";
      jobTitleInput.placeholder = "Enter your custom search query";
      jobTitleInput.disabled = false;
      queryHelper.textContent = "Enter your custom search terms";
      aiButtonContainer.style.display = "none";
    } else {
      // Handle predefined domains
      searchQueryLabel.textContent = "Search Query";
      jobTitleInput.value = domainQueries[domain];
      jobTitleInput.disabled = true;
      queryHelper.textContent =
        "Pre-defined search query for " +
        domainSelect.options[domainSelect.selectedIndex].text;
      aiButtonContainer.style.display = "none";
    }
  });

  // Add event listener for the AI generate button
  generateAiButton.addEventListener("click", generateAIQuery);

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
