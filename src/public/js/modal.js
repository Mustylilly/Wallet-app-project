  // 🔒 Validation
  if (transferAmount < 100) {
    return res.redirect("/wallet/dashboard");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // receiver lookup
    const receiverRes = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (receiverRes.rowCount === 0) {
      throw new Error("Recipient not found");
    }

    const receiverId = receiverRes.rows[0].id;

    if (receiverId === senderId) {
      throw new Error("Cannot send to yourself");
    }

    // lock sender wallet
    const senderWalletRes = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
      [senderId]
    );

    const senderBalance = Number(senderWalletRes.rows[0].balance);

    if (senderBalance < transferAmount) {
      throw new Error("Insufficient balance");
    }

    // lock receiver wallet
    await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
      [receiverId]
    );

    // debit sender
    await client.query(
      "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
      [transferAmount, senderId]
    );

    // credit receiver
    await client.query(
      "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
      [transferAmount, receiverId]
    );

    // transaction records
    await client.query(
      `
      INSERT INTO transactions (sender_id, receiver_id, amount, type)
      VALUES ($1, $2, $3, 'debit')
      `,
      [senderId, receiverId, transferAmount]
    );

    await client.query(
      `
      INSERT INTO transactions (sender_id, receiver_id, amount, type)
      VALUES ($1, $2, $3, 'credit')
      `,
      [senderId, receiverId, transferAmount]
    );

    await client.query("COMMIT");
    res.redirect("/wallet/dashboard");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transfer failed:", error.message);
    res.redirect("/wallet/dashboard");
  } finally {
    client.release();
  }




const renderLogin = (req, res) => {
  res.render("auth/login", { title: "Login" });
};

const renderRegister = (req, res) => {
  res.render("auth/register", { title: "Register" });
};

const registerUser = async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.redirect("/auth/register");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await createUser({
    email,
    password: hashedPassword
  });

  res.redirect("/auth/login");
};

const logoutUser = (req, res) => {
  req.logout(() => {
    res.redirect("/auth/login");
  });
};



const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return rows[0];
};

const findUserById = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return rows[0];
};

const createUser = async ({ email, password }) => {
  const { rows } = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
    [email, password]
  );

  // auto-create wallet
  await pool.query(
    "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
    [rows[0].id]
  );

  return rows[0];
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails[0].value;

  let user = await findUserByEmail(email);

  if (!user) {
    const { rows } = await pool.query(
      "INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING *",
      [email, profile.id]
    );

    await pool.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
      [rows[0].id]
    );

    user = rows[0];
  }

  return user;
};

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Wallet App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect("/auth/login");
};


const renderDashboard = async (req, res) => {
  const walletRes = await pool.query(
    "SELECT balance FROM wallets WHERE user_id = $1",
    [req.user.id]
  );

  const txRes = await pool.query(
    `
    SELECT type, amount, created_at
    FROM transactions
    WHERE sender_id = $1 OR receiver_id = $1
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [req.user.id]
  );

  res.render("dashboard", {
    title: "Dashboard",
    balance: walletRes.rows[0].balance,
    transactions: txRes.rows
  });
};

const sendMoney = async (req, res) => {
  const senderId = req.user.id;
  const { email, amount } = req.body;
  const transferAmount = Number(amount)};
