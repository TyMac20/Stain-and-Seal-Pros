const https = require('https');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Read PDF
  const pdfPath = path.join(process.cwd(), 'public', 'wood-care-guide.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const payload = JSON.stringify({
    from: 'Stain & Seal Pros <guides@stainandseal.pro>',
    to: [email],
    subject: 'Your Free Wood Care Guide — Stain & Seal Pros',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0B3A66;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Stain & Seal Pros</h1>
          <p style="color:#FF6A00;margin:5px 0 0;font-size:14px;">Wood Care Specialists | Springfield, MO</p>
        </div>
        <div style="padding:30px;background:#fff;">
          <h2 style="color:#0B3A66;margin-top:0;">Here's Your Free Wood Care Guide!</h2>
          <p style="color:#444;line-height:1.7;">Thanks for downloading our guide. We've attached the full PDF — it covers everything you need to know about protecting your outdoor wood in Missouri's climate.</p>
          <p style="color:#444;line-height:1.7;">Inside you'll find:</p>
          <ul style="color:#444;line-height:2;">
            <li>Why Missouri weather is tough on outdoor wood</li>
            <li>Staining vs. sealing vs. painting comparison</li>
            <li>Seasonal wood care calendar</li>
            <li>DIY vs. professional — honest breakdown</li>
            <li>Maintenance timeline</li>
            <li>Our $125/year Annual Maintenance Package</li>
          </ul>
          <p style="color:#444;line-height:1.7;">Questions about your fence, deck, or outdoor wood? We're happy to help.</p>
          <div style="text-align:center;margin:25px 0;">
            <a href="https://stainandseal.pro/get-a-free-estimate/" style="background:#FF6A00;color:#fff;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Get a Free Estimate</a>
          </div>
          <p style="color:#444;line-height:1.7;">Or call us directly: <strong><a href="tel:417-496-4694" style="color:#FF6A00;">417-496-4694</a></strong></p>
          <p style="color:#444;">— Ty & Scott<br>Stain & Seal Pros</p>
        </div>
        <div style="background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#999;">
          <p>Stain & Seal Pros | Springfield, MO | <a href="https://stainandseal.pro" style="color:#FF6A00;">stainandseal.pro</a></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'Wood-Care-Guide-Stain-Seal-Pros.pdf',
        content: pdfBase64,
      }
    ]
  });

  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200 || response.statusCode === 201) {
          res.status(200).json({ success: true, message: 'Guide sent!' });
        } else {
          console.error('Resend error:', data);
          res.status(500).json({ error: 'Failed to send email' });
        }
        resolve();
      });
    });

    request.on('error', (err) => {
      console.error('Request error:', err);
      res.status(500).json({ error: 'Server error' });
      resolve();
    });

    request.write(payload);
    request.end();
  });
};
