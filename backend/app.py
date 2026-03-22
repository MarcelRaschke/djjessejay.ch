"""
DJ Jesse Jay — Flask Backend
Handles the contact form and sends email via Gmail SMTP.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGIN", "http://localhost:8000"))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/send-booking", methods=["POST"])
def send_booking():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    message = request.form.get("message", "").strip()

    if not all([name, email, message]):
        return jsonify({"error": "Alle Felder sind erforderlich."}), 400

    if "@" not in email:
        return jsonify({"error": "Ungültige E-Mail-Adresse."}), 400

    receiver = os.getenv("EMAIL_RECEIVER")
    user = os.getenv("EMAIL_USER")
    password = os.getenv("EMAIL_PASS")

    if not all([receiver, user, password]):
        app.logger.error("E-Mail-Konfiguration unvollständig (EMAIL_USER/EMAIL_PASS/EMAIL_RECEIVER).")
        return jsonify({"error": "Serverkonfigurationsfehler."}), 500

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Neue Kontaktanfrage von {name}"
    msg["From"] = user
    msg["To"] = receiver
    msg["Reply-To"] = email

    body_text = f"Name: {name}\nE-Mail: {email}\n\nNachricht:\n{message}"
    body_html = f"""
    <html><body>
      <h2>Neue Kontaktanfrage</h2>
      <p><strong>Name:</strong> {name}</p>
      <p><strong>E-Mail:</strong> <a href="mailto:{email}">{email}</a></p>
      <hr>
      <p>{message.replace(chr(10), '<br>')}</p>
    </body></html>
    """

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(user, password)
            server.sendmail(user, receiver, msg.as_string())
        return jsonify({"message": "Nachricht erfolgreich gesendet."}), 200
    except smtplib.SMTPAuthenticationError:
        app.logger.error("SMTP-Authentifizierung fehlgeschlagen.")
        return jsonify({"error": "E-Mail konnte nicht gesendet werden."}), 500
    except Exception as exc:
        app.logger.error("SMTP-Fehler: %s", exc)
        return jsonify({"error": "E-Mail konnte nicht gesendet werden."}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
