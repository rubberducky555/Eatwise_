// dashboard.js
const isLoggedIn = localStorage.getItem("eatwise_logged_in");

if (!isLoggedIn || isLoggedIn !== "true") {
  window.location.replace("login.html");
}
document.addEventListener("DOMContentLoaded", () => {
  let calorieChart = null;
  let macroChart = null;

  /* ----------------------------------
     👤 Load user profile
  ---------------------------------- */
  const email = localStorage.getItem("eatwiseEmail");

  if (!email) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
  }

  // Profile data now handled by new profile form
  // Load profile into form fields when visiting profile tab
  /* ----------------------------------
       🧠 Session Context Memory (PHASE 2)
    ---------------------------------- */
  const sessionContext = {
    lastFood: null,
    lastAnalysis: null,
    caloriesToday: 0,
    proteinToday: 0,
    carbsToday: 0,
    fatToday: 0
  };
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");
  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      navButtons.forEach(b => b.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));
      button.classList.add("active");
      const viewId = button.dataset.view;
      const view = document.getElementById(viewId);
      if (view) view.classList.add("active");
      if (viewId === "discover" && typeof renderDiscoverPage === "function") {
        renderDiscoverPage();
      }
      if (viewId === "calories" && typeof renderCaloriesPage === "function") {
        renderCaloriesPage();
      }
    });
  });


  /* ----------------------------------
     🌙 Dark Mode
  ---------------------------------- */
  const darkToggle = document.getElementById("darkToggle");
  const body = document.body;

  if (localStorage.getItem("theme") === "dark") body.classList.add("dark");

  darkToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      body.classList.contains("dark") ? "dark" : "light"
    );
  });

  /* ----------------------------------
     🔥 Calorie Tracker State
  ---------------------------------- */
  const calorieKey = `calorieTracker_${email}`;
  let calorieTracker = JSON.parse(localStorage.getItem(calorieKey)) || [];
  let lastAIAnalysis = null;



  /* ----------------------------------
     🤖 AI Assistant
  ---------------------------------- */
  const chatArea = document.getElementById("chatArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  window.quickAsk = function (text) {
    if (!userInput || !sendBtn) return;
    userInput.value = text;
    sendBtn.click();
  };

  function addMessage(content, sender = "bot", isHTML = false) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    isHTML ? (msg.innerHTML = content) : (msg.innerText = content);
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  let typingBubble = null;

  function showTyping() {
    typingBubble = document.createElement("div");
    typingBubble.className = "message bot";
    typingBubble.innerText = "🤖 EatWise is thinking...";
    chatArea.appendChild(typingBubble);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function hideTyping() {
    if (typingBubble) {
      typingBubble.remove();
      typingBubble = null;
    }
  }

  function renderHealthVerdict(data) {
    if (!data) {
      addMessage("⚠️ Invalid nutrition data.", "bot");
      return;
    }

    sessionContext.lastFood = data.product?.name || "this food";
    sessionContext.lastAnalysis = data;

    const html = `
    <div class="chat-card">

      <h4>🧾 ${data.product.name}</h4>
      <p><strong>Net weight:</strong> ${data.product.net_weight_g} g</p>

      <hr>

      <h4>📊 Nutrition (per serving)</h4>
      <p>
        <strong>${data.nutrition.per_serving.calories_kcal}</strong> kcal ·
        Protein ${data.nutrition.per_serving.protein_g} g ·
        Carbs ${data.nutrition.per_serving.carbs_g} g ·
        Fat ${data.nutrition.per_serving.fat_g} g
      </p>

      ${data.ingredients_analysis?.ingredients?.length
        ? `
            <hr>
            <h4>📌 Ingredients</h4>
            <ul>
              ${data.ingredients_analysis.ingredients
          .map(i => `<li><strong>${i.name}</strong> — ${i.comment}</li>`)
          .join("")}
            </ul>
          `
        : ""
      }

      ${data.red_flags?.length
        ? `
            <hr>
            <h4>⚠️ Red Flags</h4>
            <ul>
              ${data.red_flags.map(f => `<li>${f}</li>`).join("")}
            </ul>
          `
        : ""
      }

      <hr>
      <h4>🍽️ Should You Eat This?</h4>
      <p>
        <strong>${data.consumption_verdict.should_you_eat}</strong><br>
        Safe amount: ${data.consumption_verdict.safe_amount_g} g
      </p>

     ${data.timing_advice
        ? `
      <hr>
      <h4>⏰ Timing Advice</h4>

      <p><strong>Best time:</strong></p>
      <ul>
        ${data.timing_advice.best_time
          .map(t => `<li>${t}</li>`)
          .join("")}
      </ul>

      <p><strong>Avoid when:</strong></p>
      <ul>
        ${data.timing_advice.worst_time
          .map(t => `<li>${t}</li>`)
          .join("")}
      </ul>

      <p><strong>Body effects:</strong></p>
      <ul>
        ${data.timing_advice.body_effects
          .map(e => `<li>${e}</li>`)
          .join("")}
      </ul>
    `
        : ""
      }

      <hr>
      <h4>✅ Final Verdict</h4>
      <p>${data.final_health_decision.summary}</p>

    </div>
  `;

    addMessage(html, "bot", true);

    // ✅ Enable smart snack button AFTER analysis
    const snackBtn = document.getElementById("smartSnackBtn");
    if (snackBtn) snackBtn.style.display = "flex";
  }




  sendBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (!text) return;

    lastAIAnalysis = null;
    addMessage(text, "user");
    userInput.value = "";

    const q = text.toLowerCase();

    // ⚡ Instant context-aware replies
    if (q.includes("can i eat more") && sessionContext.caloriesToday > 0) {
      addMessage(
        `You’ve consumed about ${sessionContext.caloriesToday} kcal today.`,
        "bot"
      );
    }

    showTyping();

    fetch("http://localhost:5000/ask-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `
User question: ${text}

Context:
- Last analyzed food: ${sessionContext.lastFood || "None"}
- Calories consumed today: ${sessionContext.caloriesToday} kcal
- Protein: ${sessionContext.proteinToday} g
- Carbs: ${sessionContext.carbsToday} g
- Fat: ${sessionContext.fatToday} g

If context is relevant, use it.
        `
      })
    })
      .then(res => res.json())
      .then(data => {
        hideTyping();
        try {
          const parsed =
            typeof data.reply === "string"
              ? JSON.parse(data.reply)
              : data.reply;
          lastAIAnalysis = parsed;
          renderHealthVerdict(parsed);
        } catch {
          addMessage(data.reply || "⚠️ Invalid AI response", "bot");
        }
      })
      .catch(() => {
        hideTyping();
        addMessage("❌ AI unavailable", "bot");
      });
  });

  userInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendBtn.click();
    }
  });

  /* ----------------------------------
     📷 Image Upload + OCR (Handles Click & Drag-n-Drop)
  ---------------------------------- */
  const uploadBtn = document.getElementById("uploadBtn");
  const foodImage = document.getElementById("foodImage");
  const chatCard = document.querySelector(".chat-interface-card"); // Target for drag & drop

  // 1. Click to upload
  uploadBtn.addEventListener("click", () => foodImage.click());

  // 2. File Input Change
  foodImage.addEventListener("change", () => {
    const file = foodImage.files[0];
    if (file) handleImageFile(file);
  });

  // 3. Drag & Drop Logic
  chatCard.addEventListener("dragover", (e) => {
    e.preventDefault();
    chatCard.classList.add("drag-active");
  });

  chatCard.addEventListener("dragleave", () => {
    chatCard.classList.remove("drag-active");
  });

  chatCard.addEventListener("drop", (e) => {
    e.preventDefault();
    chatCard.classList.remove("drag-active");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageFile(file);
      } else {
        addMessage("⚠️ Please drop an image file.", "bot");
      }
    }
  });

  // Reusable Image Handler
  function handleImageFile(file) {
    lastAIAnalysis = null;
    addMessage("📷 Scanning food label...", "bot");

    const formData = new FormData();
    formData.append("image", file);

    fetch("http://localhost:5000/analyze-image", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        try {
          const parsed = JSON.parse(data.reply);
          lastAIAnalysis = parsed;
          renderHealthVerdict(parsed);
        } catch {
          addMessage(data.reply, "bot");
        }
      })
      .catch(() => addMessage("❌ Image analysis failed", "bot"));
  }

  /* ----------------------------------
     ➕ Add to Tracker
  ---------------------------------- */
  document.getElementById("addToTracker").addEventListener("click", () => {
    if (!lastAIAnalysis?.tracker_data) {
      addMessage("⚠️ Analyze a food item first.", "bot");
      return;
    }

    const t = lastAIAnalysis.tracker_data;

    calorieTracker.push({
      food: t.food,
      quantity_g: t.quantity_g,
      calories: t.calories_kcal,
      protein: t.protein_g,
      carbs: t.carbs_g,
      fat: t.fat_g,
      time: new Date().toLocaleTimeString()
    });

    // 🔁 Update context totals
    sessionContext.caloriesToday += t.calories_kcal;
    sessionContext.proteinToday += t.protein_g;
    sessionContext.carbsToday += t.carbs_g;
    sessionContext.fatToday += t.fat_g;

    localStorage.setItem(calorieKey, JSON.stringify(calorieTracker));

    addMessage(
      "✅ Item added to your calorie tracker. Check the 🔥 Calories tab.",
      "bot"
    );

    document.querySelector('[data-view="calories"]').click();
  });

  /* ----------------------------------
     📊 Calories Page - ENHANCED
  ---------------------------------- */

  // Weight goal calculation state
  let weightGoalData = JSON.parse(localStorage.getItem('weightGoalData')) || null;

  function renderCaloriesPage() {
    const list = document.getElementById("calorieList");
    const summary = document.getElementById("calorieSummary");
    const calorieCanvas = document.getElementById("calorieChart");
    const macroCanvas = document.getElementById("macroChart");
    const emptyState = document.getElementById("emptyState");

    if (!list || !summary || !calorieCanvas || !macroCanvas) return;

    list.innerHTML = "";

    let totalCalories = 0,
      totalProtein = 0,
      totalCarbs = 0,
      totalFat = 0;

    /* =========================
       🔑 AGGREGATION FOR CHART
    ========================= */
    const foodCaloriesMap = {};

    calorieTracker.forEach(item => {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFat += item.fat;

      // 🔥 Aggregate calories per food
      if (!foodCaloriesMap[item.food]) {
        foodCaloriesMap[item.food] = 0;
      }
      foodCaloriesMap[item.food] += item.calories;

      // Ensure item has an ID for deletion
      if (!item.id) {
        item.id = Date.now() + Math.random();
      }

      // 📋 Modern list with time stamps, meal type, and delete button
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="food-item-content">
          <div class="food-item-main">
            <span class="food-item-name">${item.food}</span>
            ${item.mealType ? `<span class="meal-badge ${item.mealType}">${item.mealType}</span>` : ''}
          </div>
          <div class="food-item-macros">
            🔥 ${item.calories} kcal · 🥩 ${item.protein}g P · 🍚 ${item.carbs}g C · 🥑 ${item.fat}g F
            <br><small style="color: var(--muted);">${item.time}</small>
          </div>
        </div>
        <button class="delete-food-btn" onclick="deleteFoodItem(${item.id})">🗑️ Delete</button>
      `;
      list.appendChild(li);
    });

    // Show/hide empty state
    if (calorieTracker.length === 0) {
      emptyState.style.display = "block";
      list.style.display = "none";
    } else {
      emptyState.style.display = "none";
      list.style.display = "flex";
    }

    const labels = Object.keys(foodCaloriesMap);
    const calorieData = Object.values(foodCaloriesMap);

    // Updated summary with better formatting
    summary.innerHTML = `
      <strong>Total Calories:</strong> ${totalCalories} kcal<br>
      <strong>Macros:</strong> Protein ${totalProtein}g · Carbs ${totalCarbs}g · Fat ${totalFat}g
    `;

    // Calculate target values from weight goal data
    let targetCalories = 2000;
    let targetProtein = 150;
    let targetCarbs = 250;
    let targetFat = 65;

    if (weightGoalData) {
      targetCalories = Math.round(weightGoalData.targetCalories);
      targetProtein = Math.round(weightGoalData.macros.protein);
      targetCarbs = Math.round(weightGoalData.macros.carbs);
      targetFat = Math.round(weightGoalData.macros.fat);
    }

    // Update progress bars
    updateProgressBar('calorieProgress', 'calorieBar', totalCalories, targetCalories, 'kcal');
    updateProgressBar('proteinProgress', 'proteinBar', totalProtein, targetProtein, 'g');
    updateProgressBar('carbsProgress', 'carbsBar', totalCarbs, targetCarbs, 'g');
    updateProgressBar('fatProgress', 'fatBar', totalFat, targetFat, 'g');

    // Destroy existing charts properly
    const existingCalorieChart = Chart.getChart('calorieChart');
    const existingMacroChart = Chart.getChart('macroChart');

    if (existingCalorieChart) existingCalorieChart.destroy();
    if (existingMacroChart) existingMacroChart.destroy();

    // Create charts
    setTimeout(() => {
      if (labels.length > 0) {
        calorieChart = new Chart(calorieCanvas, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Calories",
              data: calorieData,
              backgroundColor: "#22c55e",
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      if (totalProtein > 0 || totalCarbs > 0 || totalFat > 0) {
        macroChart = new Chart(macroCanvas, {
          type: "doughnut",
          data: {
            labels: ["Protein", "Carbs", "Fat"],
            datasets: [{
              data: [totalProtein, totalCarbs, totalFat],
              backgroundColor: ["#3b82f6", "#f59e0b", "#ef4444"]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" }
            }
          }
        });
      }
    }, 120);

    // Load saved weight goal data
    loadWeightGoalData();
  }

  function updateProgressBar(labelId, barId, current, target, unit) {
    const labelEl = document.getElementById(labelId);
    const barEl = document.getElementById(barId);

    if (labelEl && barEl) {
      labelEl.textContent = `${Math.round(current)} / ${target} ${unit}`;
      const percentage = Math.min((current / target) * 100, 100);
      barEl.style.width = `${percentage}%`;
    }
  }

  // Weight Goal Calculator
  const calculateBtn = document.getElementById('calculateGoal');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateWeightGoal);
  }

  function calculateWeightGoal() {
    const currentWeight = parseFloat(document.getElementById('currentWeight').value);
    const targetWeight = parseFloat(document.getElementById('targetWeight').value);
    const timeFrame = parseInt(document.getElementById('timeFrame').value);
    const activityLevel = parseFloat(document.getElementById('activityLevel').value);

    if (!currentWeight || !targetWeight || !timeFrame) {
      alert('Please fill in all fields');
      return;
    }

    // Get user data from profile
    const ageInput = document.getElementById("profileAge");
    const age = ageInput ? (parseInt(ageInput.value) || 25) : 25;

    const genderInput = document.getElementById("profileGender");
    const gender = genderInput ? (genderInput.value || "male") : "male";

    // Calculate BMR using Mifflin-St Jeor Equation
    // For simplicity, using average height of 170cm
    let bmr;
    if (gender === "male") {
      bmr = (10 * currentWeight) + (6.25 * 170) - (5 * age) + 5;
    } else {
      bmr = (10 * currentWeight) + (6.25 * 170) - (5 * age) - 161;
    }

    // Calculate TDEE (Total Daily Energy Expenditure)
    const maintenanceCalories = Math.round(bmr * activityLevel);

    // Calculate weight change needed
    const weightChange = targetWeight - currentWeight;
    const weightChangePerWeek = weightChange / timeFrame;

    // 1 kg fat = ~7700 calories
    // Weekly calorie deficit/surplus needed
    const weeklyCalorieChange = weightChangePerWeek * 7700;
    const dailyCalorieChange = Math.round(weeklyCalorieChange / 7);

    // Target calories per day
    const targetCalories = maintenanceCalories + dailyCalorieChange;

    // Determine goal type
    let goalType, recommendation;
    if (weightChange < -0.5) {
      goalType = "Weight Loss";
      recommendation = `To lose ${Math.abs(weightChange).toFixed(1)} kg in ${timeFrame} weeks, aim for a ${Math.abs(dailyCalorieChange)} calorie deficit daily. Combine this with regular exercise and prioritize protein to preserve muscle mass.`;
    } else if (weightChange > 0.5) {
      goalType = "Weight Gain";
      recommendation = `To gain ${weightChange.toFixed(1)} kg in ${timeFrame} weeks, aim for a ${dailyCalorieChange} calorie surplus daily. Focus on strength training and ensure adequate protein intake for muscle growth.`;
    } else {
      goalType = "Maintenance";
      recommendation = `Your goal is to maintain your current weight. Stick to your maintenance calories and focus on body recomposition through consistent training and balanced nutrition.`;
    }

    // Calculate macro distribution 
    // Protein: 2g per kg body weight
    // Fat: 25-30% of total calories
    // Carbs: remaining calories
    const proteinGrams = Math.round(currentWeight * 2);
    const proteinCalories = proteinGrams * 4;
    const fatCalories = Math.round(targetCalories * 0.28);
    const fatGrams = Math.round(fatCalories / 9);
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbCalories / 4);

    // Save weight goal data
    weightGoalData = {
      currentWeight,
      targetWeight,
      timeFrame,
      activityLevel,
      maintenanceCalories,
      targetCalories,
      dailyCalorieChange,
      goalType,
      weightChange: weightChange.toFixed(1),
      recommendation,
      macros: {
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams
      }
    };

    localStorage.setItem('weightGoalData', JSON.stringify(weightGoalData));

    // Display results
    displayWeightGoalResults(weightGoalData);
  }

  function displayWeightGoalResults(data) {
    const resultsEl = document.getElementById('goalResults');
    resultsEl.style.display = 'block';

    document.getElementById('goalType').textContent = data.goalType;
    document.getElementById('weightChange').textContent = `${data.weightChange > 0 ? '+' : ''}${data.weightChange} kg`;
    document.getElementById('maintenanceCal').textContent = `${data.maintenanceCalories} kcal`;

    const targetCalEl = document.getElementById('targetCal');
    targetCalEl.textContent = `${data.targetCalories} kcal`;

    // Color code based on deficit/surplus
    if (data.dailyCalorieChange < 0) {
      targetCalEl.style.color = '#ef4444'; // Red for deficit
    } else if (data.dailyCalorieChange > 0) {
      targetCalEl.style.color = '#3b82f6'; // Blue for surplus
    } else {
      targetCalEl.style.color = '#22c55e'; // Green for maintenance
    }

    document.getElementById('recommendationText').textContent = data.recommendation;
    document.getElementById('proteinTarget').textContent = `${data.macros.protein}g`;
    document.getElementById('carbsTarget').textContent = `${data.macros.carbs}g`;
    document.getElementById('fatTarget').textContent = `${data.macros.fat}g`;

    // Update progress bars with new targets
    renderCaloriesPage();
  }

  function loadWeightGoalData() {
    if (weightGoalData) {
      document.getElementById('currentWeight').value = weightGoalData.currentWeight;
      document.getElementById('targetWeight').value = weightGoalData.targetWeight;
      document.getElementById('timeFrame').value = weightGoalData.timeFrame;
      document.getElementById('activityLevel').value = weightGoalData.activityLevel;
      displayWeightGoalResults(weightGoalData);
    }
  }

  // Reset day button
  const resetBtn = document.getElementById('resetDay');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset today\'s calorie tracking? This will clear all logged foods.')) {
        calorieTracker = [];
        localStorage.setItem(calorieKey, JSON.stringify(calorieTracker));
        sessionContext.caloriesToday = 0;
        sessionContext.proteinToday = 0;
        sessionContext.carbsToday = 0;
        sessionContext.fatToday = 0;
        renderCaloriesPage();
      }
    });
  }


  /* ----------------------------------
     🤖 AI Auto-Fill for Nutrition Values
  ---------------------------------- */
  const autoFillBtn = document.getElementById('autoFillBtn');
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', async () => {
      const foodNameInput = document.getElementById('manualFoodName');
      const foodName = foodNameInput.value.trim();

      if (!foodName) {
        alert('Please enter a food name first');
        foodNameInput.focus();
        return;
      }

      // Show loading state
      autoFillBtn.disabled = true;
      autoFillBtn.classList.add('loading');
      const originalText = autoFillBtn.innerHTML;
      autoFillBtn.innerHTML = '<span>⏳</span> Detecting...';

      try {
        // Call AI API to get nutrition values
        const response = await fetch('http://localhost:5000/ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `You are a nutrition database. For the food "${foodName}", provide ONLY a JSON response with estimated nutrition values per 100g serving. Format:
{
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>,
  "fat": <number>
}
Do not include any explanation, ONLY the JSON object. Use realistic average values for this food item.`
          })
        });

        const data = await response.json();

        // Parse AI response
        let nutritionData;
        try {
          // Try to parse as JSON directly
          nutritionData = typeof data.reply === 'string' ? JSON.parse(data.reply) : data.reply;
        } catch (e) {
          // Try to extract JSON from text
          const jsonMatch = data.reply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            nutritionData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Invalid AI response format');
          }
        }

        // Validate the data
        if (nutritionData && nutritionData.calories && nutritionData.protein && nutritionData.carbs && nutritionData.fat) {
          // Fill in the form fields
          document.getElementById('manualCalories').value = Math.round(nutritionData.calories);
          document.getElementById('manualProtein').value = parseFloat(nutritionData.protein).toFixed(1);
          document.getElementById('manualCarbs').value = parseFloat(nutritionData.carbs).toFixed(1);
          document.getElementById('manualFat').value = parseFloat(nutritionData.fat).toFixed(1);

          // Show success message
          addMessage(`✅ Auto-filled nutrition values for "${foodName}"`, "bot");
        } else {
          throw new Error('Incomplete nutrition data');
        }

      } catch (error) {
        console.error('Auto-fill error:', error);
        alert('Could not auto-fill nutrition values. Please enter them manually or try again.');
      } finally {
        // Restore button state
        autoFillBtn.disabled = false;
        autoFillBtn.classList.remove('loading');
        autoFillBtn.innerHTML = originalText;
      }
    });
  }

  /* ----------------------------------
     ➕ Manual Food Entry Form
  ---------------------------------- */
  const manualFoodForm = document.getElementById('manualFoodForm');
  if (manualFoodForm) {
    manualFoodForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const foodName = document.getElementById('manualFoodName').value.trim();
      const calories = parseFloat(document.getElementById('manualCalories').value);
      const protein = parseFloat(document.getElementById('manualProtein').value);
      const carbs = parseFloat(document.getElementById('manualCarbs').value);
      const fat = parseFloat(document.getElementById('manualFat').value);
      const mealType = document.getElementById('manualMealType').value;

      if (!foodName || !calories || !protein || !carbs || !fat) {
        alert('Please fill in all fields');
        return;
      }

      // Add to tracker
      calorieTracker.push({
        food: foodName,
        quantity_g: 100, // Default serving
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        mealType: mealType,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        id: Date.now() // Unique ID for deletion
      });

      // Update context totals
      sessionContext.caloriesToday += calories;
      sessionContext.proteinToday += protein;
      sessionContext.carbsToday += carbs;
      sessionContext.fatToday += fat;

      // Save to localStorage
      localStorage.setItem(calorieKey, JSON.stringify(calorieTracker));

      // Reset form
      manualFoodForm.reset();

      // Re-render calories page
      renderCaloriesPage();

      // Show success message
      addMessage(`✅ Added "${foodName}" to your tracker!`, "bot");
    });
  }

  // Delete food item
  window.deleteFoodItem = function (itemId) {
    if (confirm('Delete this food item?')) {
      const index = calorieTracker.findIndex(item => item.id === itemId);
      if (index !== -1) {
        const item = calorieTracker[index];

        // Update context totals
        sessionContext.caloriesToday -= item.calories;
        sessionContext.proteinToday -= item.protein;
        sessionContext.carbsToday -= item.carbs;
        sessionContext.fatToday -= item.fat;

        // Remove from array
        calorieTracker.splice(index, 1);

        // Save to localStorage
        localStorage.setItem(calorieKey, JSON.stringify(calorieTracker));

        // Re-render
        renderCaloriesPage();
      }
    }
  };


  /* ----------------------------------
     👋 Welcome Message
  ---------------------------------- */
  addMessage(
    "Hi 👋 I’m EatWise. Upload a food label or ask me anything about your diet!",
    "bot"
  );
  /* ----------------------------------
   🥗 Smart Snack Button (AFTER analysis)
  ---------------------------------- */
  const smartSnackBtn = document.getElementById("smartSnackBtn");

  if (smartSnackBtn) {
    smartSnackBtn.addEventListener("click", () => {
      console.log("✅ Smart snack button clicked");

      if (!sessionContext.lastFood) {
        addMessage("⚠️ Analyze a food first to get snack suggestions.", "bot");
        return;
      }

      addMessage(
        `Suggest a smart snack after eating ${sessionContext.lastFood} 🥗`,
        "user"
      );

      userInput.value =
        `Suggest a healthy snack considering I ate ${sessionContext.lastFood}`;
      sendBtn.click();
    });
  }
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("eatwise_logged_in");
      localStorage.removeItem("eatwise_user");
      localStorage.removeItem("eatwiseEmail");
      sessionStorage.clear();

      window.location.replace("/public/login.html");
    });
  }

});
