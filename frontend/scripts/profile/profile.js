console.log("profile.js loaded ✅");

const email = localStorage.getItem("eatwiseEmail");

if (!email) {
  alert("Session expired. Please login again.");
  window.location.href = "login.html";
}

fetch("http://127.0.0.1:5000/get-profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email })
})
  .then(res => res.json())
  .then(data => {
    document.getElementById("pName").innerText = data.name || "--";
    document.getElementById("pAge").innerText = data.age || "--";
  });

// diseases are stored during details submission
fetch("http://127.0.0.1:5000/profile-status", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email })
})
  .then(() => {
    const localProfile = JSON.parse(
      localStorage.getItem("eatwiseProfile")
    );

    document.getElementById("pDiseases").innerText =
      localProfile?.diseases?.join(", ") || "None";
  });
