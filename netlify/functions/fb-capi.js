const https = require('https');
const crypto = require('crypto');

exports.handler = async function(event, context) {
  const ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN;
  const PIXEL_ID = process.env.FB_PIXEL_ID;

  if (!ACCESS_TOKEN || !PIXEL_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing FB_CAPI_ACCESS_TOKEN or FB_PIXEL_ID in environment variables." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  let bodyData;
  try {
    bodyData = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const event_name = bodyData.event_name || "PageView";
  const pageUrl = bodyData.url || "https://pavelreality.cz";
  const fbc = bodyData.fbc || null;
  const fbp = bodyData.fbp || null;
  const email = bodyData.email || null;
  const phone = bodyData.phone || null;
  const event_id = bodyData.event_id || `${Date.now()}_${Math.random().toString(36).slice(2,10)}`;

  const headers = event.headers || {};
  const clientIp = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || null;
  const userAgent = headers['user-agent'] || null;

  // hashování email/telefonu
  const hash = (val) => crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');

  const payload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        event_source_url: pageUrl,
        action_source: "website",
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          fbc,
          fbp,
          em: email ? hash(email) : undefined,
          ph: phone ? hash(phone) : undefined
        }
      }
    ]
  };

  const postData = JSON.stringify(payload);
  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const doRequest = () => new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { 
          const json = JSON.parse(data || '{}');
          resolve({ statusCode: res.statusCode, body: json });
        } catch(e) { resolve({ statusCode: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  try {
    const resp = await doRequest();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, meta_response: resp.body }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(err) }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

