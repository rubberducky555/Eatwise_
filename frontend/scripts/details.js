console.log("details.js loaded ✅");

// ----------------------------------
// 🔐 Session validation
// ----------------------------------
const email = localStorage.getItem("eatwiseEmail");

if (!email) {
  alert("Session expired. Please login again.");
  window.location.href = "login.html";
}

// ----------------------------------
// 🚫 Prevent refilling profile if already completed
// ----------------------------------
fetch("http://localhost:5000/get-profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email })
})
  .then(res => res.json())
  .then(data => {
    // If name exists, assume profile is done
    if (data.name) {
      window.location.href = "dashboard.html";
    }
  });

// ----------------------------------
// Disease chips (multi-select)
// ----------------------------------
const chips = document.querySelectorAll(".chip");
let selectedDiseases = [];

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    const disease = chip.innerText.trim();
    chip.classList.toggle("active");

    if (selectedDiseases.includes(disease)) {
      selectedDiseases = selectedDiseases.filter(d => d !== disease);
    } else {
      selectedDiseases.push(disease);
    }
  });
});

// ----------------------------------
// Pregnancy toggle (female only)
// ----------------------------------
const genderSelect = document.querySelector("select");

const pregnancyField = document.createElement("div");
pregnancyField.innerHTML = `
  <label>Are you pregnant?</label>
  <select id="pregnant">
    <option value="no">No</option>
    <option value="yes">Yes</option>
  </select>
`;
pregnancyField.style.display = "none";
genderSelect.parentElement.appendChild(pregnancyField);

genderSelect.addEventListener("change", () => {
  pregnancyField.style.display =
    genderSelect.value === "Female" ? "block" : "none";
});

const form = document.getElementById("detailsForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.querySelector('input[placeholder="Your full name"]').value.trim();
  const age = form.querySelector('input[placeholder="Years"]').value.trim();
  const gender = genderSelect.value;

  const height = document.getElementById("setupHeight").value.trim();
  const weight = document.getElementById("setupWeight").value.trim();

  if (!name || !age || !height || !weight) {
    alert("Please fill name, age, height, and weight");
    return;
  }

  const userProfile = {
    email,
    name,
    age: Number(age),
    gender: gender.toLowerCase(),
    height: Number(height),
    weight: Number(weight),
    diseases: selectedDiseases,
    profileCompleted: true
  };

  console.log("📤 Sending profile to backend:", userProfile);

  try {
    const res = await fetch("http://localhost:5000/save-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userProfile)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to save profile");
      return;
    }

    console.log("✅ Profile saved to DB");

    // Optional local cache
    localStorage.setItem("eatwiseProfile", JSON.stringify(userProfile));

    // ✅ Redirect ONLY after DB update
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Profile save error:", err);
    alert("Server error. Try again.");
  }
});


