// 🔥 CONFIRM JS IS LOADED
console.log("signup.js loaded ✅");

// 🔒 Clear previous session
localStorage.removeItem("eatwiseEmail");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const msg = document.getElementById("msg");

  if (!form) {
    console.error("signupForm not found ❌");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msg.textContent = "Creating account...";
    msg.style.color = "#555";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      msg.textContent = "Please fill all fields ❌";
      msg.style.color = "red";
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        msg.textContent = data.message || "Signup failed ❌";
        msg.style.color = "red";
        return;
      }

      // ✅ Save email & login status for auto-redirect
      localStorage.setItem("eatwiseEmail", email);
      localStorage.setItem("eatwise_logged_in", "true");

      msg.textContent = "Account created successfully ✅";
      msg.style.color = "green";

      setTimeout(() => {
        window.location.href = "details.html";
      }, 800);

    } catch (error) {
      console.error("Signup error:", error);
      msg.textContent = "Server error ❌ Please try again";
      msg.style.color = "red";
    }
  });
});
