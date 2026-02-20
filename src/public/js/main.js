/* ===== TOAST NOTIFICATIONS ===== */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = 1;
    toast.style.transform = "translateY(0)";
  });

  // Remove after 3s
  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  document.body.appendChild(container);
  return container;
}

/* ===== UPDATE WALLET BALANCE ===== */
function updateBalance(newBalance) {
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.innerText = "₦" + newBalance;
}

/* ===== AJAX TRANSFER FORM ===== */
const transferForm = document.getElementById("transferForm");

if (transferForm) {
  transferForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const amount = document.getElementById("amount").value;
    const pin = document.getElementById("pin").value;

    // Disable button while processing
    const submitBtn = transferForm.querySelector("button");
    submitBtn.disabled = true;

    try {
      const res = await fetch("/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, amount, pin })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message, "success");
        updateBalance(data.newBalance);
        transferForm.reset();

        // Update transaction history immediately
        fetchTransactions();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ===== FETCH LIVE TRANSACTIONS ===== */
async function fetchTransactions() {
  try {
    const res = await fetch("/transactions/json");
    const data = await res.json();
    if (!data.success) return;

    const container = document.getElementById("transactionsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (data.transactions.length === 0) {
      container.innerHTML = '<p id="noTransactions">No transactions yet.</p>';
      return;
    }

    data.transactions.forEach(tx => {
      const div = document.createElement("div");
      div.className = "transaction new";

      div.innerHTML = `
        <span>Sent ₦<span class="amount">${tx.amount}</span> to ${tx.receiver}</span>
        <span class="status ${tx.status}">${tx.status}</span>
        <span>${new Date(tx.created_at).toLocaleString()}</span>
      `;

      container.appendChild(div);

      // Remove highlight after animation
      setTimeout(() => div.classList.remove("new"), 1000);
    });
  } catch (err) {
    console.error(err);
  }
}

// Refresh every 5 seconds
setInterval(fetchTransactions, 5000);

// Fetch immediately on page load
if (document.getElementById("transactionsContainer")) {
  fetchTransactions();
}

// Fetch transactions from /transactions/json
async function loadTransactions() {
  try {
    const res = await fetch("/transactions/json");
    const data = await res.json();

    const tbody = document.getElementById("transactionsBody");
    const noTransactions = document.getElementById("noTransactions");

    if (!data.success || data.transactions.length === 0) {
      if (noTransactions) noTransactions.style.display = "block";
      if (tbody) tbody.innerHTML = "";
      return;
    }

    if (noTransactions) noTransactions.style.display = "none";

    tbody.innerHTML = data.transactions
      .map(tx => `
        <tr>
          <td>${tx.reference}</td>
          <td>${tx.receiver_email}</td>
          <td>₦${tx.amount}</td>
          <td>${tx.status}</td>
          <td>${new Date(tx.created_at).toLocaleString()}</td>
        </tr>
      `)
      .join("");
  } catch (err) {
    console.error("Failed to load transactions:", err);
  }
}

// Load transactions when page is ready
document.addEventListener("DOMContentLoaded", loadTransactions);
