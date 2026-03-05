# Google Sheets Backend Setup (NOFFELO)

## 1. Create Spreadsheet
- Create a new Google Sheet named `NOFFELO-Backend`.
- Open Extensions -> Apps Script.

## 2. Add Script
- Replace default code with contents of `google-apps-script.gs`.
- Update `ADMIN_KEY` value to your own secret.

## 3. Deploy
- Click Deploy -> New deployment.
- Type: Web app.
- Execute as: Me.
- Who has access: Anyone.
- Deploy and copy Web App URL.

## 4. Connect Frontend
- In `index.html`, set:
  - `APP_CONFIG.backendEndpoint = "YOUR_WEB_APP_URL"`

## 5. Verify Writes
- Submit reservation on site.
- Check `Reservations` and `Analytics` sheets.

## 6. Admin Panel Pull
- Open `admin.html`.
- Enter password `noffelo-admin` (change it in file for production).
- Enter backend URL + your `ADMIN_KEY`.
- Click `Pull Latest Data`.

## Notes
- Keep `ADMIN_KEY` private.
- For production, limit script access and add origin checks if possible.
- Update `sitemap.xml` and `robots.txt` with your real domain.
