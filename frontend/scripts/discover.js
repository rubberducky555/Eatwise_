(function () {
  'use strict';
  // Wait for DOM to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  function init() {
    console.log('✅ Discover page initializing...');
    // Initialize discover page when it becomes visible
    const discoverSection = document.getElementById('discover');
    if (discoverSection) {
      renderDiscoverPage();
      attachEventListeners();
    }
  }
  function renderDiscoverPage() {
    loadHealthProfile();
    loadDiseaseTips();
    updateTodaysFocus();
    loadDefaultSnacks();
    loadDefaultRecipes();
    startHealthFactsCarousel();
  }
  /* ==========================================
     HEALTH PROFILE SECTION
  ========================================== */
  function loadHealthProfile() {
    const profileContent = document.getElementById('healthProfileContent');
    if (!profileContent) return;
    // Get profile from localStorage
    const profile = JSON.parse(localStorage.getItem('eatwiseProfile')) || {};
    if (!profile.name) {
      profileContent.innerHTML = `
        <p class="loading-text">
          Complete your profile in the Profile tab to get personalized recommendations!
        </p>
      `;
      return;
    }
    const diseases = profile.diseases ? (Array.isArray(profile.diseases) ? profile.diseases.join(", ") : profile.diseases) : 'None specified';
    const age = profile.age || 'Not specified';
    profileContent.innerHTML = `
      <div class="profile-info-item">
        <span class="profile-label">Name</span>
        <span class="profile-value">${profile.name}</span>
      </div>
      <div class="profile-info-item">
        <span class="profile-label">Age</span>
        <span class="profile-value">${age} years</span>
      </div>
      <div class="profile-info-item">
        <span class="profile-label">Health Conditions</span>
        <span class="profile-value">${diseases}</span>
      </div>
    `;
    // Update greeting
    const greetingEl = document.getElementById('personalizedGreeting');
    if (greetingEl && profile.name) {
      greetingEl.textContent = `Hi ${profile.name}! Get AI-powered nutrition recommendations tailored to your health profile`;
    }
  }
  /* ==========================================
     DISEASE-SPECIFIC TIPS
  ========================================== */
  function loadDiseaseTips() {
    const tipsContent = document.getElementById('diseaseTipsContent');
    if (!tipsContent) return;
    const userEmail = localStorage.getItem('eatwiseEmail');
    const profile = JSON.parse(localStorage.getItem('eatwiseProfile')) || {};
    const diseases = (Array.isArray(profile.diseases) ? profile.diseases.join(" ") : (profile.diseases || '')).toLowerCase();
    let tipsHTML = '';
    // Diabetes tips
    if (diseases.includes('diabetes')) {
      tipsHTML += `
        <div class="tip-item">
          🍬 <strong>Diabetes:</strong> Limit refined sugars and choose complex carbs like whole grains, legumes, and vegetables.
        </div>
      `;
    }
    // Hypertension tips
    if (diseases.includes('hypertension') || diseases.includes('blood pressure')) {
      tipsHTML += `
        <div class="tip-item">
          🧂 <strong>Hypertension:</strong> Reduce sodium intake. Avoid processed foods and add more potassium-rich foods like bananas.
        </div>
      `;
    }
    // Heart disease tips
    if (diseases.includes('heart')) {
      tipsHTML += `
        <div class="tip-item">
          ❤️ <strong>Heart Health:</strong> Include omega-3 fatty acids from fish, nuts, and limit saturated fats.
        </div>
      `;
    }
    // General healthy eating tip
    tipsHTML += `
      <div class="tip-item">
        🥗 <strong>General Tip:</strong> Aim for 5 servings of fruits and vegetables daily for optimal health!
      </div>
    `;
    tipsContent.innerHTML = tipsHTML || `<p class="loading-text">Add health conditions in your profile for personalized tips!</p>`;
  }
  /* ==========================================
     TODAY'S FOCUS/PROGRESS
  ========================================== */
  function updateTodaysFocus() {
    // Calculate totals directly from localStorage calorieTracker
    const userEmail = localStorage.getItem('eatwiseEmail');
    const calorieKey = `calorieTracker_${userEmail}`;
    const calorieTracker = JSON.parse(localStorage.getItem(calorieKey)) || [];

    // Calculate totals from tracker
    let totalCalories = 0;
    let totalProtein = 0;

    calorieTracker.forEach(item => {
      totalCalories += item.calories || 0;
      totalProtein += item.protein || 0;
    });

    // Get target values
    const weightGoalData = JSON.parse(localStorage.getItem('weightGoalData'));
    const targetCals = weightGoalData ? Math.round(weightGoalData.targetCalories) : 2000;
    const targetProtein = weightGoalData ? Math.round(weightGoalData.macros.protein) : 150;

    // Update display
    const caloriesEl = document.getElementById('focusCalories');
    const proteinEl = document.getElementById('focusProtein');

    if (caloriesEl) {
      caloriesEl.textContent = `${Math.round(totalCalories)} / ${targetCals}`;
    }
    if (proteinEl) {
      proteinEl.textContent = `${Math.round(totalProtein)}g / ${targetProtein}g`;
    }
  }
  /* ==========================================
     AI INSIGHTS GENERATION
  ========================================== */
  async function generateAIInsights() {
    const btn = document.getElementById('generateInsightsBtn');
    const container = document.getElementById('aiInsightsContainer');
    if (!btn || !container) return;
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Generating...';
    container.style.display = 'block';
    container.innerHTML = '<p style="text-align: center;">✨ AI is analyzing your profile...</p>';
    try {
      const userEmail = localStorage.getItem('eatwiseEmail');
      let profile = JSON.parse(localStorage.getItem('eatwiseProfile')) || {};

      // Fallback: Fetch if missing
      if (!profile.name) {
        try {
          const res = await fetch("http://localhost:5000/get-profile", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: userEmail })
          });
          if (res.ok) {
            profile = await res.json();
            localStorage.setItem('eatwiseProfile', JSON.stringify(profile));
          }
        } catch (e) { console.warn("Could not fetch profile for insights"); }
      }

      const ctx = window.sessionContext || {};
      const prompt = `You are a nutrition expert. Based on this user profile:
- Name: ${profile.name || 'User'}
- Age: ${profile.age || 'Unknown'}
- Health Conditions: ${profile.diseases || 'None'}
- Calories consumed today: ${Math.round(ctx.caloriesToday || 0)}
- Protein consumed: ${Math.round(ctx.proteinToday || 0)}g
Provide 4-5 personalized nutrition insights and recommendations. Format as a simple JSON array of strings. Each insight should be actionable and specific to their health profile.
Example format:
["Insight 1", "Insight 2", "Insight 3", "Insight 4"]
ONLY return the JSON array, nothing else.`;
      const response = await fetch('http://localhost:5000/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      const data = await response.json();
      //  Parse insights
      let insights;
      try {
        insights = JSON.parse(data.reply);
      } catch (e) {
        const match = data.reply.match(/\[[\s\S]*\]/);
        if (match) {
          insights = JSON.parse(match[0]);
        } else {
          insights = data.reply.split('\n').filter(line => line.trim());
        }
      }
      // Display insights
      let insightsHTML = '';
      insights.slice(0, 5).forEach(insight => {
        insightsHTML += `<div class="ai-insight-item">✨ ${insight}</div>`;
      });
      container.innerHTML = insightsHTML;
    } catch (error) {
      console.error('AI Insights error:', error);
      container.innerHTML = '<p style="text-align: center;">⚠️ Unable to generate insights. Try again later.</p>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>✨</span> Generate AI Insights';
    }
  }
  /* ==========================================
     SMART SNACKS AI GENERATION
  ========================================== */
  async function generateSmartSnacks() {
    const btn = document.getElementById('generateSnacksBtn');
    const grid = document.getElementById('smartSnacksGrid');
    if (!btn || !grid) return;
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Generating...';
    grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">🤖 AI is creating snack suggestions...</p>';
    try {
      const userEmail = localStorage.getItem('eatwiseEmail');
      const profile = JSON.parse(localStorage.getItem('eatwiseProfile')) || {};

      const diseasesStr = Array.isArray(profile.diseases) ? profile.diseases.join(", ") : (profile.diseases || 'general health');
      const prompt = `You are a nutrition expert. Suggest 4 healthy snacks for someone with these health conditions: ${diseasesStr}.
Return ONLY a JSON array of 4 snacks with this EXACT format:
[
  {
    "name": "Snack Name",
    "icon": "🍎",
    "calories": 95,
    "protein": 0.5,
    "carbs": 25,
    "fat": 0.3,
    "benefit": "Why it's good for this person"
  }
]
ONLY return the JSON array, no other text.`;
      const response = await fetch('http://localhost:5000/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      const data = await response.json();
      let snacks;
      try {
        snacks = JSON.parse(data.reply);
      } catch (e) {
        const match = data.reply.match(/\[[\s\S]*\]/);
        if (match) {
          snacks = JSON.parse(match[0]);
        } else {
          throw new Error('Invalid snacks format');
        }
      }
      displaySnacks(snacks);
    } catch (error) {
      console.error('Snacks generation error:', error);
      loadDefaultSnacks();
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🤖</span> AI Suggestions';
    }
  }
  function displaySnacks(snacks) {
    const grid = document.getElementById('smartSnacksGrid');
    if (!grid) return;
    let html = '';
    snacks.slice(0, 4).forEach(snack => {
      html += `
        <div class="snack-card">
          <div class="snack-icon">${snack.icon || '🍽️'}</div>
          <h5 class="snack-name">${snack.name}</h5>
          <p class="snack-calories">${snack.calories} kcal</p>
          <p class="snack-macros">P: ${snack.protein}g | C: ${snack.carbs}g | F: ${snack.fat}g</p>
          <p class="snack-benefit">${snack.benefit}</p>
        </div>
      `;
    });
    grid.innerHTML = html;
  }
  function loadDefaultSnacks() {
    const defaultSnacks = [
      {
        name: 'Greek Yogurt with Berries',
        icon: '🥣',
        calories: 150,
        protein: 15,
        carbs: 20,
        fat: 2,
        benefit: 'High protein, gut-friendly probiotics'
      },
      {
        name: 'Handful of Almonds',
        icon: '🥜',
        calories: 160,
        protein: 6,
        carbs: 6,
        fat: 14,
        benefit: 'Healthy fats and vitamin E'
      },
      {
        name: 'Apple with Peanut Butter',
        icon: '🍎',
        calories: 180,
        protein: 4,
        carbs: 25,
        fat: 8,
        benefit: 'Fiber and sustained energy'
      },
      {
        name: 'Boiled Eggs',
        icon: '🥚',
        calories: 140,
        protein: 12,
        carbs: 1,
        fat: 10,
        benefit: 'Complete protein source'
      }
    ];
    displaySnacks(defaultSnacks);
  }
  /* ==========================================
     RECIPES AI GENERATION
  ========================================== */
  async function generateRecipes() {
    const btn = document.getElementById('generateRecipesBtn');
    const grid = document.getElementById('recipesGrid');
    if (!btn || !grid) return;
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Generating...';
    grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">✨ AI is creating recipes...</p>';
    try {
      const userEmail = localStorage.getItem('eatwiseEmail');
      const profile = JSON.parse(localStorage.getItem('eatwiseProfile')) || {};

      const diseasesStr = Array.isArray(profile.diseases) ? profile.diseases.join(", ") : (profile.diseases || 'general health');
      const prompt = `You are a chef and nutritionist. Suggest 3 healthy recipes for someone with these health conditions: ${diseasesStr}.
Return ONLY a JSON array of 3 recipes with this EXACT format:
[
  {
    "name": "Recipe Name",
    "prepTime": "20 min",
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 10,
    "ingredients": "Main ingredients list",
    "benefit": "Health benefit for this person"
  }
]
ONLY return the JSON array, no other text.`;
      const response = await fetch('http://localhost:5000/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      const data = await response.json();
      let recipes;
      try {
        recipes = JSON.parse(data.reply);
      } catch (e) {
        const match = data.reply.match(/\[[\s\S]*\]/);
        if (match) {
          recipes = JSON.parse(match[0]);
        } else {
          throw new Error('Invalid recipe format');
        }
      }
      displayRecipes(recipes);
    } catch (error) {
      console.error('Recipes generation error:', error);
      loadDefaultRecipes();
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>✨</span> Get Recipes';
    }
  }
  function displayRecipes(recipes) {
    const grid = document.getElementById('recipesGrid');
    if (!grid) return;
    let html = '';
    recipes.slice(0, 3).forEach(recipe => {
      html += `
        <div class="recipe-card">
          <div class="recipe-header">
            <h5 class="recipe-name">${recipe.name}</h5>
            <p class="recipe-time">⏱️ ${recipe.prepTime}</p>
          </div>
          <div class="recipe-body">
            <div class="recipe-nutrition">
              <div class="nutrition-item">
                <span class="nutrition-value">${recipe.calories}</span>
                <span class="nutrition-label">Calories</span>
              </div>
              <div class="nutrition-item">
                <span class="nutrition-value">${recipe.protein}g</span>
                <span class="nutrition-label">Protein</span>
              </div>
              <div class="nutrition-item">
                <span class="nutrition-value">${recipe.carbs}g</span>
                <span class="nutrition-label">Carbs</span>
              </div>
            </div>
            <p class="recipe-ingredients"><strong>Ingredients:</strong> ${recipe.ingredients}</p>
            <p class="recipe-benefit">💡 ${recipe.benefit}</p>
          </div>
        </div>
      `;
    });
    grid.innerHTML = html;
  }
  function loadDefaultRecipes() {
    const defaultRecipes = [
      {
        name: 'Grilled Chicken Salad',
        prepTime: '15 min',
        calories: 350,
        protein: 35,
        carbs: 25,
        fat: 12,
        ingredients: 'Chicken breast, mixed greens, tomatoes, olive oil dressing',
        benefit: 'High protein, low carb, perfect for weight management'
      },
      {
        name: 'Quinoa Buddha Bowl',
        prepTime: '25 min',
        calories: 400,
        protein: 15,
        carbs: 50,
        fat: 15,
        ingredients: 'Quinoa, chickpeas, avocado, roasted vegetables',
        benefit: 'Complete protein, fiber-rich, heart-healthy fats'
      },
      {
        name: 'Baked Salmon with Veggies',
        prepTime: '30 min',
        calories: 380,
        protein: 30,
        carbs: 20,
        fat: 18,
        ingredients: 'Salmon fillet, broccoli, sweet potato, lemon',
        benefit: 'Omega-3 rich, anti-inflammatory, brain health'
      }
    ];
    displayRecipes(defaultRecipes);
  }
  /* ==========================================
     HEALTH FACTS CAROUSEL
  ========================================== */
  let currentFactIndex = 0;
  const healthFacts = [
    "Drinking water before meals can help reduce calorie intake by up to 13%!",
    "Eating protein at breakfast can reduce cravings throughout the day.",
    "Dark leafy greens contain vitamins A, C, K and minerals like iron and calcium.",
    "Almonds can help lower bad cholesterol and reduce heart disease risk.",
    "Green tea contains antioxidants that may boost metabolism.",
    "Fiber-rich foods help maintain healthy digestion and blood sugar levels.",
    "Regular meal timing helps regulate your body's metabolism.",
    "Colorful vegetables provide different nutrients - eat the rainbow!"
  ];
  function startHealthFactsCarousel() {
    const carousel = document.getElementById('healthFactsCarousel');
    if (!carousel) return;
    function showFact() {
      carousel.innerHTML = `<p class="health-fact-item">${healthFacts[currentFactIndex]}</p>`;
      currentFactIndex = (currentFactIndex + 1) % healthFacts.length;
    }
    showFact();
    setInterval(showFact, 6000); // Rotate every 6 seconds
  }
  /* ==========================================
     EVENT LISTENERS
  ========================================== */
  function attachEventListeners() {
    const generateInsightsBtn = document.getElementById('generateInsightsBtn');
    const refreshProfileBtn = document.getElementById('refreshProfileBtn');
    const refreshTipsBtn = document.getElementById('refreshTipsBtn');
    const generateSnacksBtn = document.getElementById('generateSnacksBtn');
    const generateRecipesBtn = document.getElementById('generateRecipesBtn');
    if (generateInsightsBtn) {
      generateInsightsBtn.addEventListener('click', generateAIInsights);
    }
    if (refreshProfileBtn) {
      refreshProfileBtn.addEventListener('click', loadHealthProfile);
    }
    if (refreshTipsBtn) {
      refreshTipsBtn.addEventListener('click', loadDiseaseTips);
    }
    if (generateSnacksBtn) {
      generateSnacksBtn.addEventListener('click', generateSmartSnacks);
    }
    if (generateRecipesBtn) {
      generateRecipesBtn.addEventListener('click', generateRecipes);
    }
  }
  // Expose to global scope if needed
  window.renderDiscoverPage = renderDiscoverPage;
  window.updateDiscoverFocus = updateTodaysFocus;
})();