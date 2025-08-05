<?php
// DJ Jesse Jay Guestbook
session_start();

// Database configuration (placeholder - update with actual credentials)
$host = 'localhost';
$dbname = 'jessejay';
$username = 'username';
$password = 'password';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // In production, log error instead of displaying it
    $db_error = "Database connection failed. Please try again later.";
}

// Handle form submission
if ($_POST && isset($_POST['name'], $_POST['email'], $_POST['message'])) {
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $message = trim($_POST['message']);
    $errors = [];
    
    // Validation
    if (empty($name)) $errors[] = "Name ist erforderlich.";
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Gültige E-Mail ist erforderlich.";
    }
    if (empty($message)) $errors[] = "Nachricht ist erforderlich.";
    
    // Basic spam protection
    if (isset($_POST['honeypot']) && !empty($_POST['honeypot'])) {
        $errors[] = "Spam detected.";
    }
    
    // If no errors and database is available, save entry
    if (empty($errors) && !isset($db_error)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO guestbook (name, email, message, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$name, $email, $message]);
            $success_message = "Vielen Dank für Ihren Eintrag!";
            
            // Clear form data
            $name = $email = $message = '';
        } catch(PDOException $e) {
            $errors[] = "Fehler beim Speichern. Bitte versuchen Sie es später erneut.";
        }
    }
}

// Fetch recent entries
$entries = [];
if (!isset($db_error)) {
    try {
        $stmt = $pdo->query("SELECT name, message, created_at FROM guestbook ORDER BY created_at DESC LIMIT 10");
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch(PDOException $e) {
        $entries = [];
    }
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gästebuch - DJ Jesse Jay</title>
    <link rel="stylesheet" href="jessejay.css">
    <style>
        .guestbook-entry {
            background: rgba(255, 255, 255, 0.05);
            margin: 20px 0;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #ff6b35;
        }
        .entry-header {
            font-weight: bold;
            color: #ff6b35;
            margin-bottom: 10px;
        }
        .entry-date {
            font-size: 0.9em;
            color: #ccc;
            float: right;
        }
        .error {
            color: #f44336;
            background: rgba(244, 67, 54, 0.1);
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .success {
            color: #4caf50;
            background: rgba(76, 175, 80, 0.1);
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .honeypot {
            position: absolute;
            left: -9999px;
            opacity: 0;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="section">
            <h1><a href="home.htm" style="color: inherit; text-decoration: none;">DJ Jesse Jay</a></h1>
            <nav>
                <ul style="list-style: none; display: flex; justify-content: center; gap: 30px; margin-top: 20px;">
                    <li><a href="home.htm">Home</a></li>
                    <li><a href="biography.php">Biografie</a></li>
                    <li><a href="music.php">Musik</a></li>
                    <li><a href="contact.php">Kontakt</a></li>
                    <li><a href="gbook.php" style="color: #ff6b35;">Gästebuch</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="section">
        <h2>Gästebuch</h2>
        <p>Lassen Sie einen Gruß da oder teilen Sie Ihre Gedanken über die Musik mit!</p>

        <?php if (isset($db_error)): ?>
            <div class="error"><?php echo htmlspecialchars($db_error); ?></div>
        <?php endif; ?>

        <?php if (!empty($errors)): ?>
            <div class="error">
                <?php foreach ($errors as $error): ?>
                    <p><?php echo htmlspecialchars($error); ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <?php if (isset($success_message)): ?>
            <div class="success"><?php echo htmlspecialchars($success_message); ?></div>
        <?php endif; ?>

        <!-- Guestbook Form -->
        <form method="post" action="" style="max-width: 600px; margin: 30px auto;">
            <div class="form-group">
                <label for="name">Name *</label>
                <input type="text" id="name" name="name" value="<?php echo isset($name) ? htmlspecialchars($name) : ''; ?>" required>
            </div>

            <div class="form-group">
                <label for="email">E-Mail *</label>
                <input type="email" id="email" name="email" value="<?php echo isset($email) ? htmlspecialchars($email) : ''; ?>" required>
            </div>

            <div class="form-group">
                <label for="message">Nachricht *</label>
                <textarea id="message" name="message" rows="5" required><?php echo isset($message) ? htmlspecialchars($message) : ''; ?></textarea>
            </div>

            <!-- Honeypot for spam protection -->
            <input type="text" name="honeypot" class="honeypot" tabindex="-1" autocomplete="off">

            <button type="submit">Eintrag hinzufügen</button>
        </form>

        <!-- Recent Entries -->
        <div style="margin-top: 60px;">
            <h3>Neueste Einträge</h3>
            
            <?php if (empty($entries)): ?>
                <p style="color: #ccc; font-style: italic;">Noch keine Einträge vorhanden. Seien Sie der Erste!</p>
            <?php else: ?>
                <?php foreach ($entries as $entry): ?>
                    <div class="guestbook-entry">
                        <div class="entry-header">
                            <?php echo htmlspecialchars($entry['name']); ?>
                            <span class="entry-date"><?php echo date('d.m.Y H:i', strtotime($entry['created_at'])); ?></span>
                        </div>
                        <div class="entry-message">
                            <?php echo nl2br(htmlspecialchars($entry['message'])); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <p>© 2003-2025 by DJ Jesse Jay & @®† from Zürich 🇨🇭</p>
            </div>
        </div>
    </footer>

    <script>
        // Auto-hide messages after 5 seconds
        setTimeout(function() {
            const messages = document.querySelectorAll('.success, .error');
            messages.forEach(function(msg) {
                msg.style.opacity = '0';
                msg.style.transition = 'opacity 0.5s';
                setTimeout(function() {
                    msg.style.display = 'none';
                }, 500);
            });
        }, 5000);
    </script>
</body>
</html>
