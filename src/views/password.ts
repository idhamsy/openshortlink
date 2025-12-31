export const passwordHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Link</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: #3b82f6;
      --primary-hover: #2563eb;
      --bg-color: #f3f4f6;
      --card-bg: #ffffff;
      --text-color: #1f2937;
      --border-color: #e5e7eb;
    }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    h1 {
      margin-top: 0;
      margin-bottom: 1rem;
      font-size: 1.5rem;
      font-weight: 600;
    }
    p {
      margin-bottom: 1.5rem;
      color: #6b7280;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      margin-bottom: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 0.375rem;
      box-sizing: border-box;
      font-size: 1rem;
    }
    input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: var(--primary-hover);
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Password Protected</h1>
    <p>This link is password protected. Please enter the password to continue.</p>
    <form id="password-form" method="POST" action="/__verify_password__">
      <input type="hidden" name="domain" value="{{DOMAIN}}">
      <input type="hidden" name="slug" value="{{SLUG}}">
      <input type="hidden" name="link_id" value="{{LINK_ID}}">
      <input type="password" name="password" placeholder="Enter password" required autofocus>
      <button type="submit">Submit</button>
      <div id="error-msg" class="error">Incorrect password</div>
    </form>
  </div>
  <script>
    // Check for error query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      document.getElementById('error-msg').style.display = 'block';
    }
  </script>
</body>
</html>
`;
